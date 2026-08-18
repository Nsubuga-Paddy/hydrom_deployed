from .models import Dam, RealTimeSensorData, Notification, RemoteSensingData, Prediction, DamPrecipitationState, FeedbackSubmission, SystemReport

#Importing random sensor data
import random
from django.shortcuts import redirect, render, get_object_or_404
from django.http import FileResponse, Http404, HttpResponse, JsonResponse
from pathlib import Path
from django.views.decorators.csrf import csrf_exempt

from django.contrib import messages
from django.contrib.auth import authenticate, login, logout
from django.core.mail import send_mail
from django.urls import reverse
from django.conf import settings
import uuid

from .forms import CustomUserCreationForm
from .models import UserProfile
from django.contrib.auth.forms import UserCreationForm

from django.contrib.auth.decorators import login_required

import json
from datetime import datetime, timedelta
import requests
from django.http import JsonResponse

from .forms import DamSelectionForm, CustomUserCreationForm
import csv

from django.utils import timezone
from django.db.models import ForeignKey, Min, Max
from django.db.models.functions import TruncDate

from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

import numpy as np
import pandas as pd
import io
import base64

from .auth_api import (  # noqa: F401 — re-exported for urls.py
    api_auth_csrf,
    api_auth_login,
    api_auth_logout,
    api_auth_me,
    api_auth_signup,
    api_auth_verify,
)
# create a new view that retrieves the dams from the database and passes them to a context variable.

def home_view(request):
    """Serve the Vite React SPA when built; fall back to legacy home."""
    return spa_view(request)


def spa_view(request):
    """
    Serve the React build's index.html for client-side routes.
    Build with: cd web && npm ci && npm run build
    """
    index_path = getattr(settings, 'FRONTEND_INDEX', None)
    if index_path and Path(index_path).is_file():
        return FileResponse(Path(index_path).open('rb'), content_type='text/html')

    # Dev fallback before the first frontend build
    return render(request, 'home2.html')


@login_required(login_url='login')
def legacy_home_view(request):
    return render(request, 'home2.html')


def about_us(request):
    return render(request, 'about-us.html')

def contact_us(request):
    return render(request, 'contact-us.html')


@csrf_exempt
def api_feedback_submit(request):
    """
    POST /api/feedback/

    Accepts Hydro-M staff feedback and stores it for Django admin review.
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    try:
        payload = json.loads(request.body.decode('utf-8') or '{}')
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON body'}, status=400)

    name = str(payload.get('name') or '').strip()
    email = str(payload.get('email') or '').strip()
    department = str(payload.get('department') or '').strip()
    area = str(payload.get('area') or '').strip()
    priority = str(payload.get('priority') or 'normal').strip().lower()
    message = str(payload.get('message') or '').strip()

    valid_priorities = {choice[0] for choice in FeedbackSubmission.PRIORITY_CHOICES}
    if priority not in valid_priorities:
        priority = 'normal'

    if not name:
        return JsonResponse({'error': 'Name is required.'}, status=400)
    if not area:
        return JsonResponse({'error': 'Feedback area is required.'}, status=400)
    if not message:
        return JsonResponse({'error': 'Feedback details are required.'}, status=400)
    if len(message) < 10:
        return JsonResponse({'error': 'Please provide a bit more detail in your feedback.'}, status=400)

    feedback = FeedbackSubmission.objects.create(
        name=name,
        email=email,
        department=department,
        area=area,
        priority=priority,
        message=message,
    )

    return JsonResponse({
        'message': 'Feedback received',
        'id': feedback.id,
        'createdAt': feedback.created_at.isoformat(),
    }, status=201)


def help(request):
    return render(request, 'help.html')


@csrf_exempt
def api_assistant_chat(request):
    """
    POST /api/assistant/chat/

    Body: { "messages": [{ "role": "user"|"assistant", "content": "..." }] }
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    try:
        payload = json.loads(request.body.decode('utf-8') or '{}')
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON body'}, status=400)

    messages = payload.get('messages')
    if not isinstance(messages, list) or not messages:
        # Allow single message convenience field
        single = str(payload.get('message') or '').strip()
        if not single:
            return JsonResponse({'error': 'messages array or message string is required.'}, status=400)
        messages = [{'role': 'user', 'content': single}]

    normalized = []
    for item in messages[-12:]:
        if not isinstance(item, dict):
            continue
        role = item.get('role')
        content = str(item.get('content') or item.get('text') or '').strip()
        if role in ('user', 'assistant') and content:
            normalized.append({'role': role, 'content': content})

    if not normalized:
        return JsonResponse({'error': 'No valid chat messages provided.'}, status=400)

    from .assistant_service import run_assistant

    result = run_assistant(normalized)
    return JsonResponse({
        'reply': result.get('reply', ''),
        'attachments': result.get('attachments', []),
        'provider': result.get('provider', 'fallback'),
    })


def api_assistant_report_download(request, filename):
    """GET /api/assistant/reports/<filename>/"""
    from django.http import FileResponse
    from .assistant_service import resolve_report_file

    path = resolve_report_file(filename)
    if path is None:
        return JsonResponse({'error': 'Report not found.'}, status=404)

    return FileResponse(path.open('rb'), as_attachment=True, filename=path.name)


def api_system_reports_list(request):
    """GET /api/system-reports/?period=weekly|monthly|all"""
    from .report_service import serialize_system_report

    period = (request.GET.get('period') or 'all').strip().lower()
    qs = SystemReport.objects.exclude(status=SystemReport.STATUS_FAILED)
    if period in (SystemReport.PERIOD_WEEKLY, SystemReport.PERIOD_MONTHLY):
        qs = qs.filter(period_type=period)

    payload = [serialize_system_report(report, request) for report in qs[:100]]
    return JsonResponse({
        'count': len(payload),
        'weeklyCount': SystemReport.objects.filter(period_type=SystemReport.PERIOD_WEEKLY).exclude(
            status=SystemReport.STATUS_FAILED
        ).count(),
        'monthlyCount': SystemReport.objects.filter(period_type=SystemReport.PERIOD_MONTHLY).exclude(
            status=SystemReport.STATUS_FAILED
        ).count(),
        'reports': payload,
    })


def api_system_report_detail(request, report_id):
    """GET /api/system-reports/<id>/"""
    from .report_service import serialize_system_report

    report = get_object_or_404(SystemReport, pk=report_id)
    return JsonResponse(serialize_system_report(report, request))


def api_system_report_pdf(request, report_id):
    """GET /api/system-reports/<id>/pdf/"""
    from django.http import FileResponse

    report = get_object_or_404(SystemReport, pk=report_id)
    if not report.pdf_file:
        return JsonResponse({'error': 'PDF not available for this report.'}, status=404)
    filename = report.pdf_file.name.replace('\\', '/').split('/')[-1]
    return FileResponse(
        report.pdf_file.open('rb'),
        as_attachment=True,
        filename=filename,
    )


#Real time view
@login_required(login_url='login')
def dam_realtime_view(request, dam_id):
    dam = get_object_or_404(Dam, pk=dam_id)

    latest_realtime_data = RealTimeSensorData.objects.filter(dam=dam).order_by('-timestamp').first()

    # Set the latest_realtime_data as an attribute of the dam object
    dam.latest_realtime_data = latest_realtime_data

    context = {
        'current_dam_id': dam_id,
        'dam' : dam,
        'latest_realtime_data' : latest_realtime_data,
        }

    return render (request, 'dam_realtime.html', context)

#Query the database for the last 20 realtime values
@login_required(login_url='login') 
def get_rt_sensor_data(request, dam_id):

    dam = get_object_or_404(Dam, pk=dam_id)

    rt_sensor_data = RealTimeSensorData.objects.filter(dam=dam).order_by('-timestamp')[:20]

    rt_data = {
        'timestamps': [entry.timestamp.strftime("%Y-%m-%d %H:%M:%S") for entry in rt_sensor_data],
        'waterlevels': [float(entry.reservoir_waterlevel) for entry in rt_sensor_data],
        'reservoir_waterlevels': [float(entry.reservoir_waterlevel) for entry in rt_sensor_data],
        'head_race_waterlevels': [
            float(entry.head_race_waterlevel) if entry.head_race_waterlevel is not None else None
            for entry in rt_sensor_data
        ],
        'tail_race_waterlevels': [
            float(entry.tail_race_waterlevel) if entry.tail_race_waterlevel is not None else None
            for entry in rt_sensor_data
        ],
        'dispatchs': [entry.dispatch for entry in rt_sensor_data],
        'discharges': [entry.discharge for entry in rt_sensor_data],
        'precipitations': [float(entry.precipitation) for entry in rt_sensor_data],  # Already stored as delta
        'humiditys': [entry.humidity for entry in rt_sensor_data],
        'temperatures': [entry.temperature for entry in rt_sensor_data],
    }

    return JsonResponse(rt_data)


KNOWN_DAM_SLUGS = ('nalubaale', 'bujagali', 'kiira', 'isimba')


def dam_to_slug(dam):
    """Map Dam.name to the React frontend slug (e.g. 'Bujagali HPP' -> 'bujagali')."""
    name = (dam.name or '').strip().lower()
    for slug in KNOWN_DAM_SLUGS:
        if slug in name:
            return slug
    return ''.join(ch if ch.isalnum() else '-' for ch in name).strip('-') or str(dam.pk)


def resolve_dam(dam_id):
    """Resolve a dam by integer PK or frontend slug."""
    dam_id_str = str(dam_id).strip()
    if dam_id_str.isdigit():
        return get_object_or_404(Dam, pk=int(dam_id_str))

    slug = dam_id_str.lower()
    for dam in Dam.objects.all():
        if dam_to_slug(dam) == slug:
            return dam
    raise Http404(f"No dam matches '{dam_id}'")


def format_level_m(value):
    """Format a Decimal/float water level as 'X.XXX m', or null when missing."""
    if value is None:
        return None
    return f'{float(value):.3f} m'


def format_realtime_metrics(latest):
    """Format RealTimeSensorData for the React API contract.

    Reservoir is measured at the dam. Head race and tail race are separate
    upstream/downstream sensors and may be null until installed.
    """
    if latest is None:
        return {
            'reservoirWaterLevel': None,
            'headRaceWaterLevel': None,
            'tailRaceWaterLevel': None,
            'dispatch': None,
            'discharge': None,
            'humidity': None,
            'temperature': None,
            'precipitation': None,
        }

    return {
        'reservoirWaterLevel': format_level_m(latest.reservoir_waterlevel),
        'headRaceWaterLevel': format_level_m(latest.head_race_waterlevel),
        'tailRaceWaterLevel': format_level_m(latest.tail_race_waterlevel),
        # Dispatch and discharge sensors are not installed yet — always null for the React UI.
        'dispatch': None,
        'discharge': None,
        'humidity': f'{latest.humidity}%',
        'temperature': f'{float(latest.temperature):.2f}°C',
        'precipitation': f'{float(latest.precipitation):.2f}mm',
    }


def serialize_dam(dam, latest=None):
    """Serialize a Dam (optionally with latest realtime row) for the React API."""
    if latest is None:
        latest = RealTimeSensorData.objects.filter(dam=dam).order_by('-timestamp').first()

    metrics = format_realtime_metrics(latest)
    return {
        'id': dam_to_slug(dam),
        'databaseId': dam.id,
        'name': dam.name,
        'location': dam.location,
        'order': dam.order,
        'latitude': float(dam.latitude) if dam.latitude is not None else None,
        'longitude': float(dam.longitude) if dam.longitude is not None else None,
        'timestamp': latest.timestamp.isoformat() if latest else None,
        'reservoirWaterLevel': metrics['reservoirWaterLevel'],
        'headRaceWaterLevel': metrics['headRaceWaterLevel'],
        'tailRaceWaterLevel': metrics['tailRaceWaterLevel'],
        'dispatch': metrics['dispatch'],
        'discharge': metrics['discharge'],
        'metrics': metrics,
    }


def api_dams_list(request):
    """
    GET /api/dams/

    Cascade dams from the admin Dam model, ordered by Dam.order.
    Includes latest realtime summary when available.
    """
    dams = Dam.objects.all().order_by('order', 'id')
    payload = [serialize_dam(dam) for dam in dams]
    return JsonResponse(payload, safe=False)


def api_dam_realtime(request, dam_id):
    """
    GET /api/dams/<dam_id>/realtime/

    Latest realtime readings for one dam. Accepts database PK or slug (e.g. kiira).
    Open for the first React integration slice (auth can be added later).
    """
    dam = resolve_dam(dam_id)
    latest = RealTimeSensorData.objects.filter(dam=dam).order_by('-timestamp').first()
    payload = serialize_dam(dam, latest)
    return JsonResponse(payload)


def api_dam_predictions(request, dam_id):
    """
    GET /api/dams/<dam_id>/predictions/?refresh=1

    Returns observed recent reservoir levels plus the live LSTM 5-hour forecast.
    Regenerates when missing/stale, or when refresh=1.
    """
    from .prediction import get_or_refresh_forecast

    dam = resolve_dam(dam_id)
    force = str(request.GET.get('refresh') or '').strip().lower() in {'1', 'true', 'yes'}
    payload = get_or_refresh_forecast(dam, force=force)
    payload['id'] = dam_to_slug(dam)
    status = 200 if payload.get('status') != 'error' else 503
    return JsonResponse(payload, status=status)


def api_dam_predictions_run(request, dam_id):
    """
    POST /api/dams/<dam_id>/predictions/run/

    Force a fresh LSTM forecast for the dam.
    """
    from .prediction import PredictionError, run_forecast_for_dam

    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    dam = resolve_dam(dam_id)
    try:
        result = run_forecast_for_dam(dam)
    except PredictionError as exc:
        return JsonResponse({'error': str(exc)}, status=400)
    except Exception as exc:  # noqa: BLE001
        return JsonResponse({'error': f'Forecast engine error: {exc}'}, status=500)

    result['id'] = dam_to_slug(dam)
    result['name'] = dam.name
    return JsonResponse(result)


HISTORY_RANGE_HOURS = {
    '1h': 1,
    '6h': 6,
    '24h': 24,
    '7d': 24 * 7,
}


def api_dam_realtime_history(request, dam_id):
    """
    GET /api/dams/<dam_id>/realtime/history/?range=24h

    Chart-ready realtime history from RealTimeSensorData.
    Head-race and tail-race series are null until those sensors exist.
    Dispatch and discharge series are also null until installed.

    The selected range is applied relative to the dam's latest reading so charts
    still work when the newest stored samples are older than "now".
    """
    dam = resolve_dam(dam_id)
    range_key = (request.GET.get('range') or '24h').strip().lower()
    if range_key not in HISTORY_RANGE_HOURS:
        range_key = '24h'

    latest = RealTimeSensorData.objects.filter(dam=dam).order_by('-timestamp').first()
    if latest is None:
        return JsonResponse({
            'id': dam_to_slug(dam),
            'databaseId': dam.id,
            'range': range_key,
            'labels': [],
            'reservoirWaterLevels': [],
            'headRaceWaterLevels': [],
            'tailRaceWaterLevels': [],
            'dispatches': [],
            'discharges': [],
            'humidity': [],
            'temperature': [],
            'precipitation': [],
        })

    end = latest.timestamp
    start = end - timedelta(hours=HISTORY_RANGE_HOURS[range_key])
    entries = list(
        RealTimeSensorData.objects.filter(
            dam=dam,
            timestamp__gte=start,
            timestamp__lte=end,
        ).order_by('timestamp')
    )

    labels = []
    reservoir = []
    head_race = []
    tail_race = []
    humidity = []
    temperature = []
    precipitation = []

    for entry in entries:
        local_ts = timezone.localtime(entry.timestamp) if timezone.is_aware(entry.timestamp) else entry.timestamp
        if range_key == '7d':
            labels.append(local_ts.strftime('%b %d %H:%M'))
        else:
            labels.append(local_ts.strftime('%H:%M'))

        reservoir.append(float(entry.reservoir_waterlevel))
        head_race.append(
            float(entry.head_race_waterlevel) if entry.head_race_waterlevel is not None else None
        )
        tail_race.append(
            float(entry.tail_race_waterlevel) if entry.tail_race_waterlevel is not None else None
        )
        humidity.append(float(entry.humidity))
        temperature.append(float(entry.temperature))
        precipitation.append(float(entry.precipitation))

    point_count = len(entries)
    return JsonResponse({
        'id': dam_to_slug(dam),
        'databaseId': dam.id,
        'range': range_key,
        'labels': labels,
        'reservoirWaterLevels': reservoir,
        'headRaceWaterLevels': head_race,
        'tailRaceWaterLevels': tail_race,
        'dispatches': [None] * point_count,
        'discharges': [None] * point_count,
        'humidity': humidity,
        'temperature': temperature,
        'precipitation': precipitation,
    })


DOWNLOAD_DATASETS = {
    'realtime': RealTimeSensorData,
    'gis': RemoteSensingData,
    'predictions': Prediction,
    'prediction': Prediction,
}


def resolve_download_dams(dam_param):
    """Resolve dam query param: 'all', slug, or database id."""
    if not dam_param or dam_param == 'all':
        return list(Dam.objects.all().order_by('order', 'id')), 'all'

    dam = resolve_dam(dam_param)
    return [dam], dam_to_slug(dam)


def dataset_queryset(dataset, dams):
    model = DOWNLOAD_DATASETS.get(dataset)
    if model is None:
        return None, None
    return model.objects.filter(dam__in=dams), model


def build_availability_windows(dates):
    """Build contiguous available windows and unavailable dates from a sorted date list."""
    if not dates:
        return [], []

    windows = []
    unavailable = []
    window_start = dates[0]
    previous = dates[0]

    for current in dates[1:]:
        gap_days = (current - previous).days
        if gap_days > 1:
            windows.append({
                'start': window_start.isoformat(),
                'end': previous.isoformat(),
            })
            cursor = previous + timedelta(days=1)
            while cursor < current:
                unavailable.append(cursor.isoformat())
                cursor += timedelta(days=1)
            window_start = current
        previous = current

    windows.append({
        'start': window_start.isoformat(),
        'end': previous.isoformat(),
    })
    return windows, unavailable


def api_download_availability(request):
    """
    GET /api/download-data/availability/?dam=<dam_id|all>&dataset=realtime
    """
    dam_param = (request.GET.get('dam') or 'all').strip()
    dataset = (request.GET.get('dataset') or 'realtime').strip().lower()

    if dataset == 'alarms':
        return JsonResponse({
            'damId': dam_param if dam_param != 'all' else 'all',
            'dataset': 'alarms',
            'earliestDate': None,
            'latestDate': None,
            'recordCount': 0,
            'availableDays': 0,
            'spanDays': 0,
            'coverage': 'Alarm export is not available yet',
            'availableWindows': [],
            'unavailableDates': [],
        })

    if dataset not in DOWNLOAD_DATASETS:
        return JsonResponse({'error': f'Unsupported dataset: {dataset}'}, status=400)

    try:
        dams, dam_id = resolve_download_dams(dam_param)
    except Http404:
        return JsonResponse({'error': f'No dam matches "{dam_param}"'}, status=404)

    qs, _model = dataset_queryset(dataset, dams)
    record_count = qs.count()
    dataset_name = 'predictions' if dataset == 'prediction' else dataset

    if not record_count:
        return JsonResponse({
            'damId': dam_id,
            'dataset': dataset_name,
            'earliestDate': None,
            'latestDate': None,
            'recordCount': 0,
            'availableDays': 0,
            'spanDays': 0,
            'coverage': 'No data available',
            'availableWindows': [],
            'unavailableDates': [],
        })

    dates = []
    for day in (
        qs.annotate(day=TruncDate('timestamp'))
        .values_list('day', flat=True)
        .distinct()
        .order_by('day')
    ):
        dates.append(day.date() if hasattr(day, 'date') else day)

    earliest = dates[0]
    latest = dates[-1]
    span_days = (latest - earliest).days + 1
    available_days = len(dates)
    windows, unavailable = build_availability_windows(dates)

    return JsonResponse({
        'damId': dam_id,
        'dataset': dataset_name,
        'earliestDate': earliest.isoformat(),
        'latestDate': latest.isoformat(),
        'recordCount': record_count,
        'availableDays': available_days,
        'spanDays': span_days,
        'coverage': f'{available_days} of {span_days} days available',
        'availableWindows': windows,
        'unavailableDates': unavailable,
    })


def _iso_timestamp(value):
    if timezone.is_aware(value):
        return timezone.localtime(value).isoformat()
    return value.isoformat()


def api_download_export(request):
    """
    GET /api/download-data/export/?dam=<dam_id|all>&dataset=realtime&start=YYYY-MM-DD&end=YYYY-MM-DD&format=csv&resolution=raw|daily
    """
    from collections import defaultdict

    dam_param = (request.GET.get('dam') or 'all').strip()
    dataset = (request.GET.get('dataset') or 'realtime').strip().lower()
    start_raw = (request.GET.get('start') or '').strip()
    end_raw = (request.GET.get('end') or '').strip()
    file_format = (request.GET.get('format') or 'csv').strip().lower()
    resolution = (request.GET.get('resolution') or 'raw').strip().lower()

    if file_format != 'csv':
        return JsonResponse({'error': 'Only CSV export is supported at the moment.'}, status=400)

    if dataset == 'alarms':
        return JsonResponse({'error': 'Alarm export is not available yet.'}, status=400)

    if dataset not in DOWNLOAD_DATASETS:
        return JsonResponse({'error': f'Unsupported dataset: {dataset}'}, status=400)

    try:
        start_date = datetime.strptime(start_raw, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_raw, '%Y-%m-%d').date()
    except ValueError:
        return JsonResponse({'error': 'start and end must be YYYY-MM-DD dates.'}, status=400)

    if end_date < start_date:
        return JsonResponse({'error': 'End date must be on or after start date.'}, status=400)

    try:
        dams, dam_id = resolve_download_dams(dam_param)
    except Http404:
        return JsonResponse({'error': f'No dam matches "{dam_param}"'}, status=404)

    qs, model = dataset_queryset(dataset, dams)
    start_datetime = timezone.make_aware(
        datetime.combine(start_date, datetime.min.time()),
        timezone.get_current_timezone(),
    )
    end_datetime = timezone.make_aware(
        datetime.combine(end_date, datetime.max.time()),
        timezone.get_current_timezone(),
    )
    qs = qs.filter(timestamp__range=[start_datetime, end_datetime]).order_by('timestamp', 'dam_id')

    if not qs.exists():
        return JsonResponse({'error': 'No data available for the selected criteria.'}, status=404)

    dataset_name = 'predictions' if dataset == 'prediction' else dataset
    filename = f'{dataset_name}_{dam_id}_{start_raw}_to_{end_raw}.csv'
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    writer = csv.writer(response)
    MAX_EXPORT_ROWS = 100000
    rows = qs.select_related('dam')[:MAX_EXPORT_ROWS]

    if model is RealTimeSensorData:
        if resolution in ('daily', 'hourly', 'monthly'):
            buckets = defaultdict(list)
            for entry in rows.iterator(chunk_size=1000):
                local_ts = timezone.localtime(entry.timestamp) if timezone.is_aware(entry.timestamp) else entry.timestamp
                if resolution == 'hourly':
                    key = (entry.dam_id, local_ts.replace(minute=0, second=0, microsecond=0))
                elif resolution == 'monthly':
                    key = (entry.dam_id, local_ts.strftime('%Y-%m'))
                else:
                    key = (entry.dam_id, local_ts.date())
                buckets[key].append(entry)

            writer.writerow([
                'period',
                'dam_id',
                'dam_name',
                'avg_reservoir_water_level_m',
                'avg_humidity',
                'avg_temperature_c',
                'total_precipitation_mm',
                'sample_count',
            ])
            for key, items in sorted(buckets.items(), key=lambda item: (str(item[0][1]), item[0][0])):
                dam_pk, period = key
                count = len(items)
                period_label = period.isoformat() if hasattr(period, 'isoformat') else str(period)
                writer.writerow([
                    period_label,
                    dam_pk,
                    items[0].dam.name,
                    round(sum(float(i.reservoir_waterlevel) for i in items) / count, 3),
                    round(sum(i.humidity for i in items) / count, 2),
                    round(sum(float(i.temperature) for i in items) / count, 2),
                    round(sum(float(i.precipitation) for i in items), 2),
                    count,
                ])
            return response

        writer.writerow([
            'timestamp',
            'dam_id',
            'dam_name',
            'reservoir_water_level_m',
            'head_race_water_level_m',
            'tail_race_water_level_m',
            'dispatch',
            'discharge',
            'humidity',
            'temperature_c',
            'precipitation_mm',
        ])
        for entry in rows.iterator(chunk_size=1000):
            writer.writerow([
                _iso_timestamp(entry.timestamp),
                entry.dam_id,
                entry.dam.name,
                float(entry.reservoir_waterlevel),
                float(entry.head_race_waterlevel) if entry.head_race_waterlevel is not None else '',
                float(entry.tail_race_waterlevel) if entry.tail_race_waterlevel is not None else '',
                '',
                '',
                entry.humidity,
                float(entry.temperature),
                float(entry.precipitation),
            ])
        return response

    if model is RemoteSensingData:
        writer.writerow([
            'timestamp',
            'dam_id',
            'dam_name',
            'reservoir_water_level_m',
            'precipitation_mm',
            'humidity',
            'temperature_c',
        ])
        for entry in rows.iterator(chunk_size=1000):
            writer.writerow([
                _iso_timestamp(entry.timestamp),
                entry.dam_id,
                entry.dam.name,
                float(entry.waterlevel),
                float(entry.precipitation),
                entry.humidity,
                float(entry.temperature),
            ])
        return response

    if model is Prediction:
        writer.writerow([
            'timestamp',
            'dam_id',
            'dam_name',
            'predicted_reservoir_water_level_m',
        ])
        for entry in rows.iterator(chunk_size=1000):
            writer.writerow([
                _iso_timestamp(entry.timestamp),
                entry.dam_id,
                entry.dam.name,
                float(entry.waterlevel_prediction),
            ])
        return response

    return JsonResponse({'error': 'Unsupported dataset.'}, status=400)


#Remote sensing view
@login_required(login_url='login')
def dam_gis_view(request, dam_id):
    dam = get_object_or_404(Dam, pk=dam_id)

    # Location weather via Open-Meteo (no API key). Water levels stay station-measured.
    if dam.latitude is not None and dam.longitude is not None:
        api_endpoint = 'https://api.open-meteo.com/v1/forecast'
        params = {
            'latitude': float(dam.latitude),
            'longitude': float(dam.longitude),
            'current': 'temperature_2m,relative_humidity_2m,precipitation',
            'timezone': 'auto',
        }
        response = requests.get(api_endpoint, params=params, timeout=12)

        if response.status_code == 200:
            weather_data = response.json()
            current = weather_data.get('current') or {}
            context = {
                'current_dam_id': dam_id,
                'dam': dam,
                'temperature': current.get('temperature_2m'),
                'humidity': current.get('relative_humidity_2m'),
                'precipitation': current.get('precipitation', 0),
                'weather_source': 'Open-Meteo',
            }
            return render(request, 'dam_gis.html', context)

    remote_sensing_data = None
    try:
        remote_sensing_data = RemoteSensingData.objects.filter(dam=dam).latest('timestamp')
    except RemoteSensingData.DoesNotExist:
        remote_sensing_data = None

    context = {
        'current_dam_id': dam_id,
        'dam': dam,
        'remote_sensing_data': remote_sensing_data,
        'temperature': None,
        'humidity': None,
        'precipitation': None,
        'weather_source': 'Open-Meteo',
    }
    return render(request, 'dam_gis.html', context)


#Predictions view
@login_required(login_url='login')
def dam_pred_view(request, dam_id):
    dam = get_object_or_404(Dam, pk=dam_id)
    context = {
        'current_dam_id': dam_id,
        'dam' : dam,
        }
    
    return render (request, 'dam_pred.html', context)


#Trigger for notifcations with login required decorator 
@login_required(login_url='login')
def system_alarms(request):
    return render(request, 'notifications.html')

#Function to receive data from the hydrom device to the database
@csrf_exempt
def store_data(request):
    if request.method == 'POST':

        # Verify the API key
        api_key = request.headers.get('X-API-Key')
        if api_key != settings.API_KEY:
            return JsonResponse({"error": "Invalid or missing API key"}, status=403)

        try:
            data = json.loads(request.body)

            dam_id = data.get('dam_id')
            temperature = float(data.get('temperature'))
            humidity = int(data.get('humidity'))
            # Current device sensor measures reservoir level at the dam (meters).
            raw_reservoir = (
                data.get('reservoir_waterlevel')
                or data.get('reservoir_water_level')
                or data.get('waterlevel')
                or data.get('water_level')
                or data.get('WaterLevel')
            )
            if isinstance(raw_reservoir, str):
                raw_reservoir = str(raw_reservoir).rstrip('mM').strip()
            reservoir_meters = round(float(raw_reservoir), 3)

            def optional_level(keys):
                raw = None
                for key in keys:
                    if data.get(key) is not None:
                        raw = data.get(key)
                        break
                if raw is None or raw == '':
                    return None
                if isinstance(raw, str):
                    raw = str(raw).rstrip('mM').strip()
                return round(float(raw), 3)

            head_race_meters = optional_level((
                'head_race_waterlevel',
                'head_race_water_level',
                'head_race',
                'headRaceWaterLevel',
            ))
            tail_race_meters = optional_level((
                'tail_race_waterlevel',
                'tail_race_water_level',
                'tail_race',
                'tailRaceWaterLevel',
            ))

            dispatch = int(data.get('dispatch'))
            discharge = int(data.get('discharge'))
            precipitation_cumulative = float(data.get('precipitation'))  # Sensor sends cumulative

            # Convert cumulative to delta (distinct value per interval)
            state, _ = DamPrecipitationState.objects.get_or_create(
                dam_id=dam_id,
                defaults={'last_cumulative': 0}
            )
            precipitation_delta = max(0, precipitation_cumulative - float(state.last_cumulative))
            state.last_cumulative = precipitation_cumulative
            state.save()

            # Save data to the database — let Django set the timestamp
            RealTimeSensorData.objects.create(
                dam_id=dam_id,
                temperature=temperature,
                humidity=humidity,
                reservoir_waterlevel=reservoir_meters,
                head_race_waterlevel=head_race_meters,
                tail_race_waterlevel=tail_race_meters,
                dispatch=dispatch,
                discharge=discharge,
                precipitation=round(precipitation_delta, 2)  # Store delta in mm
            )

            # Refresh LSTM forecast in the background of the request (best-effort).
            try:
                from .prediction import try_run_forecast_after_ingest

                try_run_forecast_after_ingest(int(dam_id))
            except Exception:  # noqa: BLE001
                pass

            return HttpResponse('Data stored successfully.')

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    else:
        return HttpResponse('Invalid request method.')



#Download data view with login required decorator
@login_required(login_url='login')
def download_data_view(request):
    dams = Dam.objects.order_by('order')

    # Compute available data range per dam and data type for display
    for dam in dams:
        # Realtime
        rt_agg = RealTimeSensorData.objects.filter(dam=dam).aggregate(
            min_ts=Min('timestamp'),
            max_ts=Max('timestamp'),
        )
        dam.realtime_range = {'min': rt_agg['min_ts'], 'max': rt_agg['max_ts']} if (rt_agg['min_ts'] and rt_agg['max_ts']) else None
        # GIS
        rs_agg = RemoteSensingData.objects.filter(dam=dam).aggregate(
            min_ts=Min('timestamp'),
            max_ts=Max('timestamp'),
        )
        dam.gis_range = {'min': rs_agg['min_ts'], 'max': rs_agg['max_ts']} if (rs_agg['min_ts'] and rs_agg['max_ts']) else None
        # Prediction
        pred_agg = Prediction.objects.filter(dam=dam).aggregate(
            min_ts=Min('timestamp'),
            max_ts=Max('timestamp'),
        )
        dam.prediction_range = {'min': pred_agg['min_ts'], 'max': pred_agg['max_ts']} if (pred_agg['min_ts'] and pred_agg['max_ts']) else None

    # Isimba dam for data range display (only show Isimba)
    isimba_dam = next((d for d in dams if 'isimba' in d.name.lower()), None)

    if request.method == 'POST':
        form = DamSelectionForm(request.POST)
        if form.is_valid():
            selected_dam = form.cleaned_data['dam']
            data_categories = form.cleaned_data['data_category']
            start_date = form.cleaned_data['start_date']
            end_date = form.cleaned_data['end_date']

            for data_type in data_categories:
                # Use timezone-aware datetimes (Django USE_TZ=True)
                start_datetime = timezone.make_aware(
                    datetime.combine(start_date, datetime.min.time()),
                    timezone.get_current_timezone()
                )
                end_datetime = timezone.make_aware(
                    datetime.combine(end_date, datetime.max.time()),
                    timezone.get_current_timezone()
                )

                # Filter the data based on the selected type and date range
                if data_type == 'realtime':
                    data = RealTimeSensorData.objects.filter(
                        dam=selected_dam,
                        timestamp__range=[start_datetime, end_datetime]
                    )
                    model = RealTimeSensorData

                elif data_type == 'gis':
                    data = RemoteSensingData.objects.filter(
                        dam=selected_dam,
                        timestamp__range=[start_datetime, end_datetime]
                    )
                    model = RemoteSensingData

                elif data_type == 'prediction':
                    data = Prediction.objects.filter(
                        dam=selected_dam,
                        timestamp__range=[start_datetime, end_datetime]
                    )
                    model = Prediction
                else:
                    continue  # Skip unknown data types

                if not data.exists():
                    messages.error(request, "No data available for the selected criteria.")
                    context = {'dams': dams, 'form': form, 'isimba_dam': isimba_dam}
                    return render(request, 'download-data.html', context)

                # Build field list: use attname (e.g. dam_id) for ForeignKey to avoid N+1 queries
                field_names = []
                for field in model._meta.fields:
                    if isinstance(field, ForeignKey):
                        field_names.append(field.attname)  # e.g. 'dam_id'
                    else:
                        field_names.append(field.name)

                response = HttpResponse(content_type='text/csv')
                response['Content-Disposition'] = f'attachment; filename="{data_type}_data.csv"'

                writer = csv.writer(response)
                writer.writerow(field_names)

                # Use values_list with iterator() for memory efficiency on large datasets
                # Limit to 100k rows to prevent timeout/OOM on Railway
                MAX_EXPORT_ROWS = 100000
                if model:
                    for row in data.values_list(*field_names)[:MAX_EXPORT_ROWS].iterator(chunk_size=1000):
                        writer.writerow(row)

                return response
            
    else:
        form = DamSelectionForm()

    context = {'dams': dams, 'form': form, 'isimba_dam': isimba_dam}
    return render(request, 'download-data.html', context)

#Creating a user registration form
def registerPage(request):
    if request.user.is_authenticated:
        return redirect('home')
    else:
        form = CustomUserCreationForm()

        if request.method == 'POST':
            form = CustomUserCreationForm(request.POST)
            if form.is_valid():
                form.save()
                #creating a flash message
                user = form.cleaned_data.get('username')
                messages.success(request, 'Account successfully created for ' + user + '. Please login')

                return redirect('login')

        context = {'form':form}
        return render(request, 'register.html', context)

#Function for logging in
def loginPage(request):
    if request.user.is_authenticated:
        return redirect('home')
    else:
        if request.method == 'POST':
            username = request.POST.get('username')
            password = request.POST.get('password')

            user = authenticate(request, username=username, password=password)

            if user is not None:
                login(request, user)
                return redirect('home')
            else:
                messages.info(request, 'Username Or Password is incorrect. Please try again')

        context = {}
        return render(request, 'login.html', context)

#Function for logging out
def logoutUser(request):
    logout(request)
    return redirect('login')


def new_frontend_view(request):
    """View for the new frontend"""
    return render(request, 'new_frontend.html')


