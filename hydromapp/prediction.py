"""
Live reservoir water-level forecasting with the trained Keras LSTM.

Model input: 24 timesteps × 3 features (precipitation, humidity, temperature)
Model output: 5 future reservoir water-level steps (hourly)
"""
from __future__ import annotations

import logging
from datetime import timedelta
from functools import lru_cache
from pathlib import Path

import numpy as np
import pandas as pd
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from sklearn.preprocessing import MinMaxScaler

from .models import Dam, Prediction, RealTimeSensorData

logger = logging.getLogger(__name__)

N_STEPS_IN = 24
N_STEPS_OUT = 5
MIN_HISTORY = N_STEPS_IN
FEATURE_COLUMNS = ['precipitation', 'humidity', 'temperature']
TARGET_COLUMN = 'reservoir_waterlevel'
MODEL_DIR = Path(__file__).resolve().parent


class PredictionError(Exception):
    """Raised when a forecast cannot be produced."""


@lru_cache(maxsize=1)
def load_prediction_model():
    """Load Keras model once per process."""
    # Import lazily so Django can boot without TensorFlow for non-prediction paths.
    from tensorflow.keras.models import model_from_json

    architecture = MODEL_DIR / 'pred_model.json'
    weights = MODEL_DIR / 'pred_model_weights.h5'
    if not architecture.is_file() or not weights.is_file():
        raise PredictionError(
            f'Prediction model files missing under {MODEL_DIR} '
            '(expected pred_model.json and pred_model_weights.h5).'
        )

    with architecture.open('r', encoding='utf-8') as handle:
        model = model_from_json(handle.read())
    model.load_weights(str(weights))
    # Regression compile (architecture is multi-step water-level forecast).
    model.compile(loss='mse', optimizer='adam')
    return model


def _history_frame(dam: Dam, limit: int = 500) -> pd.DataFrame:
    qs = (
        RealTimeSensorData.objects.filter(dam=dam)
        .order_by('-timestamp')
        .values('timestamp', *FEATURE_COLUMNS, TARGET_COLUMN)[:limit]
    )
    rows = list(qs)
    if not rows:
        return pd.DataFrame(columns=['timestamp', *FEATURE_COLUMNS, TARGET_COLUMN])

    frame = pd.DataFrame(rows).iloc[::-1].reset_index(drop=True)
    for column in FEATURE_COLUMNS + [TARGET_COLUMN]:
        frame[column] = pd.to_numeric(frame[column], errors='coerce')
    frame = frame.dropna(subset=FEATURE_COLUMNS + [TARGET_COLUMN])
    return frame


def _build_forecast_window(frame: pd.DataFrame):
    if len(frame) < MIN_HISTORY:
        raise PredictionError(
            f'Need at least {MIN_HISTORY} realtime samples to forecast; found {len(frame)}.'
        )

    feature_scaler = MinMaxScaler()
    target_scaler = MinMaxScaler()
    features_scaled = feature_scaler.fit_transform(frame[FEATURE_COLUMNS].to_numpy(dtype=float))
    targets_scaled = target_scaler.fit_transform(frame[[TARGET_COLUMN]].to_numpy(dtype=float))

    window = features_scaled[-N_STEPS_IN:]
    x = window.reshape(1, N_STEPS_IN, len(FEATURE_COLUMNS))
    return x, target_scaler, float(frame[TARGET_COLUMN].iloc[-1]), frame


@transaction.atomic
def run_forecast_for_dam(dam_id, *, replace_future: bool = True) -> dict:
    """
    Run the LSTM for one dam and store the next 5 hourly water-level predictions.
    Returns a serializable forecast payload.
    """
    dam = dam_id if isinstance(dam_id, Dam) else get_object_or_404(Dam, pk=dam_id)

    frame = _history_frame(dam)
    x, target_scaler, current_level, history = _build_forecast_window(frame)
    model = load_prediction_model()

    raw_pred = model.predict(x, verbose=0)
    scaled = np.asarray(raw_pred, dtype=float).reshape(-1, 1)
    if scaled.shape[0] != N_STEPS_OUT:
        # Some exports may return (1, 5) already handled; guard odd shapes.
        scaled = scaled.reshape(N_STEPS_OUT, 1)
    levels = target_scaler.inverse_transform(scaled).reshape(-1)

    now = timezone.now()
    if replace_future:
        Prediction.objects.filter(dam=dam, timestamp__gte=now).delete()

    forecast_rows = []
    for offset, level in enumerate(levels, start=1):
        ts = now + timedelta(hours=offset)
        value = round(float(level), 3)
        Prediction.objects.create(
            dam=dam,
            timestamp=ts,
            waterlevel_prediction=value,
        )
        forecast_rows.append({
            'timestamp': ts.isoformat(),
            'hourOffset': offset,
            'value': value,
        })

    final_value = forecast_rows[-1]['value'] if forecast_rows else current_level
    return {
        'damId': dam.id,
        'generatedAt': now.isoformat(),
        'currentObserved': round(current_level, 3),
        'finalForecast': final_value,
        'expectedChange': round(final_value - current_level, 3),
        'horizonHours': N_STEPS_OUT,
        'unit': 'm',
        'forecast': forecast_rows,
        'samplesUsed': len(history),
    }


def get_or_refresh_forecast(dam, *, max_age_minutes: int = 30, force: bool = False) -> dict:
    """Return latest forecast; regenerate if missing/stale or force=True."""
    now = timezone.now()
    future = (
        Prediction.objects.filter(dam=dam, timestamp__gte=now)
        .order_by('timestamp')
    )
    latest_rt = (
        RealTimeSensorData.objects.filter(dam=dam)
        .order_by('-timestamp')
        .first()
    )
    current = float(latest_rt.reservoir_waterlevel) if latest_rt else None

    needs_refresh = force or not future.exists()
    if not needs_refresh and latest_rt is not None:
        first_future = future.first()
        generated_approx = first_future.timestamp - timedelta(hours=1)
        age = now - generated_approx
        if age > timedelta(minutes=max_age_minutes):
            needs_refresh = True
        if latest_rt.timestamp > generated_approx:
            needs_refresh = True

    run_meta = None
    error = None
    if needs_refresh:
        try:
            run_meta = run_forecast_for_dam(dam)
            future = (
                Prediction.objects.filter(dam=dam, timestamp__gte=timezone.now())
                .order_by('timestamp')
            )
            current = run_meta['currentObserved']
        except PredictionError as exc:
            error = str(exc)
            logger.warning('Forecast refresh failed for dam %s: %s', dam.id, exc)
        except Exception as exc:  # noqa: BLE001
            error = f'Forecast engine error: {exc}'
            logger.exception('Unexpected forecast failure for dam %s', dam.id)

    forecast = [
        {
            'timestamp': row.timestamp.isoformat(),
            'hourOffset': index,
            'value': float(row.waterlevel_prediction),
        }
        for index, row in enumerate(future[:N_STEPS_OUT], start=1)
    ]

    observed_qs = (
        RealTimeSensorData.objects.filter(dam=dam)
        .order_by('-timestamp')
        .values('timestamp', 'reservoir_waterlevel', *FEATURE_COLUMNS)[:12]
    )
    observed = [
        {
            'timestamp': row['timestamp'].isoformat(),
            'value': float(row['reservoir_waterlevel']),
        }
        for row in reversed(list(observed_qs))
    ]

    latest_inputs = None
    if latest_rt is not None:
        latest_inputs = {
            'precipitation': float(latest_rt.precipitation),
            'humidity': float(latest_rt.humidity),
            'temperature': float(latest_rt.temperature),
        }

    final_forecast = forecast[-1]['value'] if forecast else current
    expected_change = (
        round(final_forecast - current, 3)
        if final_forecast is not None and current is not None
        else None
    )

    status = 'ready' if forecast else 'unavailable'
    if error and not forecast:
        status = 'error'

    return {
        'databaseId': dam.id,
        'name': dam.name,
        'status': status,
        'unit': 'm',
        'horizonHours': N_STEPS_OUT,
        'generatedAt': run_meta['generatedAt'] if run_meta else (
            forecast[0]['timestamp'] if forecast else None
        ),
        'currentObserved': current,
        'finalForecast': final_forecast,
        'expectedChange': expected_change,
        'observed': observed,
        'forecast': forecast,
        'inputs': latest_inputs,
        'error': error,
        'model': {
            'type': 'LSTM',
            'stepsIn': N_STEPS_IN,
            'stepsOut': N_STEPS_OUT,
            'features': FEATURE_COLUMNS,
            'target': TARGET_COLUMN,
        },
    }


def try_run_forecast_after_ingest(dam_id: int) -> None:
    """Best-effort forecast refresh after device ingest (never raises)."""
    try:
        count = RealTimeSensorData.objects.filter(dam_id=dam_id).count()
        if count < MIN_HISTORY:
            return
        run_forecast_for_dam(dam_id)
    except Exception:  # noqa: BLE001
        logger.exception('Post-ingest forecast failed for dam_id=%s', dam_id)
