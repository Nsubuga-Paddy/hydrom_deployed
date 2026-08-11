"""
Hydro-M Assistant service.

Uses OpenAI tool calling when OPENAI_API_KEY is configured.
Falls back to a deterministic DB-backed responder when no key is set.
"""

from __future__ import annotations

import csv
import json
import re
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from statistics import mean

from django.conf import settings
from django.db.models import Max, Min
from django.db.models.functions import TruncDate
from django.utils import timezone

from .models import Dam, Prediction, RealTimeSensorData, RemoteSensingData


KNOWN_DAM_SLUGS = ('nalubaale', 'bujagali', 'kiira', 'isimba')

SYSTEM_PROMPT = """You are Hydro-M Assistant for UEGCL dam cascade monitoring.
Answer only using tool results from the Hydro-M database.
Be concise and operational.
Water levels: reservoir (at the dam, currently measured), head race (upstream, may be unavailable),
and tail race (downstream, may be unavailable).
If a sensor is not installed (head race, tail race, dispatch, discharge), clearly say the data is not available.
Do not invent readings, dates, or dams.
When a report is generated, tell the user it is ready and include the download path from the tool result.
"""


def dam_to_slug(dam: Dam) -> str:
    name = (dam.name or '').strip().lower()
    for slug in KNOWN_DAM_SLUGS:
        if slug in name:
            return slug
    return ''.join(ch if ch.isalnum() else '-' for ch in name).strip('-') or str(dam.pk)


def resolve_dam(dam_id: str) -> Dam | None:
    dam_id_str = str(dam_id or '').strip()
    if not dam_id_str:
        return None
    if dam_id_str.isdigit():
        return Dam.objects.filter(pk=int(dam_id_str)).first()
    slug = dam_id_str.lower()
    for dam in Dam.objects.all():
        if dam_to_slug(dam) == slug or slug in (dam.name or '').lower():
            return dam
    return None


def _iso(value):
    if value is None:
        return None
    if timezone.is_aware(value):
        return timezone.localtime(value).isoformat()
    return value.isoformat()


def tool_list_dams(_args=None):
    dams = []
    for dam in Dam.objects.all().order_by('order', 'id'):
        latest = RealTimeSensorData.objects.filter(dam=dam).order_by('-timestamp').first()
        dams.append({
            'id': dam_to_slug(dam),
            'databaseId': dam.id,
            'name': dam.name,
            'location': dam.location,
            'hasRealtimeData': bool(latest),
            'latestTimestamp': _iso(latest.timestamp) if latest else None,
        })
    return {'dams': dams, 'count': len(dams)}


def tool_get_dam_latest(args):
    dam = resolve_dam(args.get('dam_id') or args.get('dam') or '')
    if not dam:
        return {'error': 'Dam not found. Use list_dams to see available dams.'}

    latest = RealTimeSensorData.objects.filter(dam=dam).order_by('-timestamp').first()
    if not latest:
        return {
            'id': dam_to_slug(dam),
            'name': dam.name,
            'message': 'No realtime sensor data available for this dam yet.',
            'metrics': None,
        }

    notes = []
    if latest.head_race_waterlevel is None:
        notes.append('Head race sensor is not installed or has no reading yet.')
    if latest.tail_race_waterlevel is None:
        notes.append('Tail race sensor is not installed or has no reading yet.')
    notes.extend([
        'Dispatch sensor is not installed.',
        'Discharge sensor is not installed.',
    ])

    return {
        'id': dam_to_slug(dam),
        'name': dam.name,
        'timestamp': _iso(latest.timestamp),
        'metrics': {
            'reservoirWaterLevel_m': float(latest.reservoir_waterlevel),
            'headRaceWaterLevel_m': (
                float(latest.head_race_waterlevel)
                if latest.head_race_waterlevel is not None
                else None
            ),
            'tailRaceWaterLevel_m': (
                float(latest.tail_race_waterlevel)
                if latest.tail_race_waterlevel is not None
                else None
            ),
            'dispatch': None,
            'discharge': None,
            'humidity_percent': latest.humidity,
            'temperature_c': float(latest.temperature),
            'precipitation_mm': float(latest.precipitation),
        },
        'notes': notes,
    }


HISTORY_RANGE_HOURS = {
    '1h': 1,
    '6h': 6,
    '24h': 24,
    '7d': 24 * 7,
}


def tool_get_dam_history(args):
    dam = resolve_dam(args.get('dam_id') or args.get('dam') or '')
    if not dam:
        return {'error': 'Dam not found. Use list_dams to see available dams.'}

    range_key = str(args.get('range') or '24h').strip().lower()
    if range_key not in HISTORY_RANGE_HOURS:
        range_key = '24h'

    latest = RealTimeSensorData.objects.filter(dam=dam).order_by('-timestamp').first()
    if not latest:
        return {
            'id': dam_to_slug(dam),
            'name': dam.name,
            'range': range_key,
            'message': 'No realtime history available for this dam.',
            'sampleCount': 0,
        }

    end = latest.timestamp
    start = end - timedelta(hours=HISTORY_RANGE_HOURS[range_key])
    entries = list(
        RealTimeSensorData.objects.filter(
            dam=dam,
            timestamp__gte=start,
            timestamp__lte=end,
        ).order_by('timestamp')
    )

    if not entries:
        return {
            'id': dam_to_slug(dam),
            'name': dam.name,
            'range': range_key,
            'message': 'No samples found in the selected range.',
            'sampleCount': 0,
        }

    water = [float(e.reservoir_waterlevel) for e in entries]
    humidity = [float(e.humidity) for e in entries]
    temperature = [float(e.temperature) for e in entries]
    precipitation = [float(e.precipitation) for e in entries]
    unavailable = []
    if all(e.head_race_waterlevel is None for e in entries):
        unavailable.append('headRace')
    if all(e.tail_race_waterlevel is None for e in entries):
        unavailable.append('tailRace')
    unavailable.extend(['dispatch', 'discharge'])

    return {
        'id': dam_to_slug(dam),
        'name': dam.name,
        'range': range_key,
        'sampleCount': len(entries),
        'from': _iso(entries[0].timestamp),
        'to': _iso(entries[-1].timestamp),
        'reservoirWaterLevel_m': {
            'min': round(min(water), 3),
            'max': round(max(water), 3),
            'avg': round(mean(water), 3),
            'latest': round(water[-1], 3),
        },
        'humidity_percent': {
            'min': round(min(humidity), 2),
            'max': round(max(humidity), 2),
            'avg': round(mean(humidity), 2),
            'latest': round(humidity[-1], 2),
        },
        'temperature_c': {
            'min': round(min(temperature), 2),
            'max': round(max(temperature), 2),
            'avg': round(mean(temperature), 2),
            'latest': round(temperature[-1], 2),
        },
        'precipitation_mm': {
            'total': round(sum(precipitation), 2),
            'avg': round(mean(precipitation), 2),
            'latest': round(precipitation[-1], 2),
        },
        'unavailableSensors': unavailable,
    }


def tool_get_data_availability(args):
    dataset = str(args.get('dataset') or 'realtime').strip().lower()
    dam_param = str(args.get('dam_id') or args.get('dam') or 'all').strip().lower()

    model_map = {
        'realtime': RealTimeSensorData,
        'gis': RemoteSensingData,
        'predictions': Prediction,
        'prediction': Prediction,
    }
    model = model_map.get(dataset)
    if model is None:
        return {'error': f'Unsupported dataset: {dataset}'}

    if dam_param in ('', 'all'):
        qs = model.objects.all()
        dam_id = 'all'
    else:
        dam = resolve_dam(dam_param)
        if not dam:
            return {'error': 'Dam not found.'}
        qs = model.objects.filter(dam=dam)
        dam_id = dam_to_slug(dam)

    record_count = qs.count()
    if not record_count:
        return {
            'damId': dam_id,
            'dataset': dataset,
            'recordCount': 0,
            'coverage': 'No data available',
            'earliestDate': None,
            'latestDate': None,
        }

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
    return {
        'damId': dam_id,
        'dataset': dataset,
        'recordCount': record_count,
        'availableDays': len(dates),
        'spanDays': span_days,
        'coverage': f'{len(dates)} of {span_days} days available',
        'earliestDate': earliest.isoformat(),
        'latestDate': latest.isoformat(),
        'availableWindowsPreview': [
            {'start': dates[0].isoformat(), 'end': dates[-1].isoformat()}
        ] if dates else [],
    }


def tool_generate_report(args):
    dataset = str(args.get('dataset') or 'realtime').strip().lower()
    dam_param = str(args.get('dam_id') or args.get('dam') or 'all').strip().lower()
    start_raw = str(args.get('start') or '').strip()
    end_raw = str(args.get('end') or '').strip()

    model_map = {
        'realtime': RealTimeSensorData,
        'gis': RemoteSensingData,
        'predictions': Prediction,
        'prediction': Prediction,
    }
    model = model_map.get(dataset)
    if model is None:
        return {'error': f'Unsupported dataset: {dataset}'}

    if dam_param in ('', 'all'):
        dams = list(Dam.objects.all().order_by('order', 'id'))
        dam_id = 'all'
        qs = model.objects.filter(dam__in=dams)
    else:
        dam = resolve_dam(dam_param)
        if not dam:
            return {'error': 'Dam not found.'}
        dams = [dam]
        dam_id = dam_to_slug(dam)
        qs = model.objects.filter(dam=dam)

    if not start_raw or not end_raw:
        agg = qs.aggregate(min_ts=Min('timestamp'), max_ts=Max('timestamp'))
        if not agg['min_ts'] or not agg['max_ts']:
            return {'error': 'No data available to generate a report.'}
        start_date = timezone.localtime(agg['min_ts']).date() if timezone.is_aware(agg['min_ts']) else agg['min_ts'].date()
        end_date = timezone.localtime(agg['max_ts']).date() if timezone.is_aware(agg['max_ts']) else agg['max_ts'].date()
    else:
        try:
            start_date = datetime.strptime(start_raw, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_raw, '%Y-%m-%d').date()
        except ValueError:
            return {'error': 'start and end must be YYYY-MM-DD.'}

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
        return {'error': 'No data available for the selected report criteria.'}

    reports_dir = Path(settings.MEDIA_ROOT) / 'assistant_reports'
    reports_dir.mkdir(parents=True, exist_ok=True)
    filename = f'{dataset}_{dam_id}_{start_date.isoformat()}_to_{end_date.isoformat()}_{uuid.uuid4().hex[:8]}.csv'
    filepath = reports_dir / filename

    with filepath.open('w', newline='', encoding='utf-8') as handle:
        writer = csv.writer(handle)
        if model is RealTimeSensorData:
            writer.writerow([
                'timestamp', 'dam_id', 'dam_name', 'reservoir_water_level_m',
                'head_race_water_level_m', 'tail_race_water_level_m',
                'dispatch', 'discharge',
                'humidity', 'temperature_c', 'precipitation_mm',
            ])
            for entry in qs.select_related('dam')[:100000].iterator(chunk_size=1000):
                writer.writerow([
                    _iso(entry.timestamp),
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
        elif model is RemoteSensingData:
            writer.writerow([
                'timestamp', 'dam_id', 'dam_name', 'reservoir_water_level_m',
                'precipitation_mm', 'humidity', 'temperature_c',
            ])
            for entry in qs.select_related('dam')[:100000].iterator(chunk_size=1000):
                writer.writerow([
                    _iso(entry.timestamp),
                    entry.dam_id,
                    entry.dam.name,
                    float(entry.waterlevel),
                    float(entry.precipitation),
                    entry.humidity,
                    float(entry.temperature),
                ])
        else:
            writer.writerow([
                'timestamp', 'dam_id', 'dam_name', 'predicted_reservoir_water_level_m',
            ])
            for entry in qs.select_related('dam')[:100000].iterator(chunk_size=1000):
                writer.writerow([
                    _iso(entry.timestamp),
                    entry.dam_id,
                    entry.dam.name,
                    float(entry.waterlevel_prediction),
                ])

    download_path = f'/api/assistant/reports/{filename}'
    return {
        'status': 'ready',
        'dataset': dataset,
        'damId': dam_id,
        'start': start_date.isoformat(),
        'end': end_date.isoformat(),
        'filename': filename,
        'downloadPath': download_path,
        'recordCount': qs.count(),
        'message': 'Report generated successfully.',
    }


TOOL_HANDLERS = {
    'list_dams': tool_list_dams,
    'get_dam_latest': tool_get_dam_latest,
    'get_dam_history': tool_get_dam_history,
    'get_data_availability': tool_get_data_availability,
    'generate_report': tool_generate_report,
}

OPENAI_TOOLS = [
    {
        'type': 'function',
        'function': {
            'name': 'list_dams',
            'description': 'List cascade dams currently configured in Hydro-M admin.',
            'parameters': {'type': 'object', 'properties': {}, 'additionalProperties': False},
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'get_dam_latest',
            'description': 'Get the latest realtime readings for one dam.',
            'parameters': {
                'type': 'object',
                'properties': {
                    'dam_id': {
                        'type': 'string',
                        'description': 'Dam slug or database id, e.g. isimba or nalubaale.',
                    },
                },
                'required': ['dam_id'],
                'additionalProperties': False,
            },
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'get_dam_history',
            'description': 'Summarise realtime history for a dam over 1h, 6h, 24h, or 7d relative to the latest sample.',
            'parameters': {
                'type': 'object',
                'properties': {
                    'dam_id': {'type': 'string'},
                    'range': {'type': 'string', 'enum': ['1h', '6h', '24h', '7d']},
                },
                'required': ['dam_id'],
                'additionalProperties': False,
            },
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'get_data_availability',
            'description': 'Get stored data coverage for realtime, gis, or predictions.',
            'parameters': {
                'type': 'object',
                'properties': {
                    'dam_id': {'type': 'string', 'description': 'Dam slug/id or all'},
                    'dataset': {'type': 'string', 'enum': ['realtime', 'gis', 'predictions']},
                },
                'required': ['dataset'],
                'additionalProperties': False,
            },
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'generate_report',
            'description': 'Generate a CSV report from Hydro-M database records and return a download path.',
            'parameters': {
                'type': 'object',
                'properties': {
                    'dam_id': {'type': 'string', 'description': 'Dam slug/id or all'},
                    'dataset': {'type': 'string', 'enum': ['realtime', 'gis', 'predictions']},
                    'start': {'type': 'string', 'description': 'YYYY-MM-DD (optional)'},
                    'end': {'type': 'string', 'description': 'YYYY-MM-DD (optional)'},
                },
                'required': ['dataset'],
                'additionalProperties': False,
            },
        },
    },
]


def run_tool(name: str, arguments) -> dict:
    handler = TOOL_HANDLERS.get(name)
    if not handler:
        return {'error': f'Unknown tool: {name}'}
    if isinstance(arguments, str):
        try:
            arguments = json.loads(arguments or '{}')
        except json.JSONDecodeError:
            arguments = {}
    if not isinstance(arguments, dict):
        arguments = {}
    try:
        return handler(arguments)
    except Exception as exc:  # noqa: BLE001 - surface tool failures to the model/user
        return {'error': str(exc)}


def _extract_dam_hint(text: str) -> str | None:
    lowered = text.lower()
    for dam in Dam.objects.all():
        slug = dam_to_slug(dam)
        if slug in lowered or (dam.name or '').lower() in lowered:
            return slug
    for slug in KNOWN_DAM_SLUGS:
        if slug in lowered:
            return slug
    return None


def run_fallback_assistant(message: str) -> dict:
    """Deterministic DB-backed assistant used when OpenAI is not configured."""
    text = (message or '').strip()
    lowered = text.lower()
    dam_id = _extract_dam_hint(text)
    attachments = []

    if any(token in lowered for token in ('report', 'export', 'csv', 'download')):
        dataset = 'realtime'
        if 'gis' in lowered:
            dataset = 'gis'
        elif 'prediction' in lowered:
            dataset = 'predictions'
        result = tool_generate_report({
            'dam_id': dam_id or 'all',
            'dataset': dataset,
        })
        if result.get('error'):
            return {'reply': result['error'], 'attachments': [], 'provider': 'fallback'}
        attachments.append({
            'type': 'report',
            'filename': result['filename'],
            'downloadPath': result['downloadPath'],
            'label': f"Download {result['dataset']} report",
        })
        reply = (
            f"Report ready for {result['damId']} ({result['dataset']}) "
            f"from {result['start']} to {result['end']}. "
            f"{result['recordCount']} records included."
        )
        return {'reply': reply, 'attachments': attachments, 'provider': 'fallback'}

    if any(token in lowered for token in ('list dam', 'which dam', 'available dam', 'cascade')):
        result = tool_list_dams()
        names = ', '.join(item['name'] for item in result['dams']) or 'none'
        return {
            'reply': f"Configured cascade dams ({result['count']}): {names}.",
            'attachments': [],
            'provider': 'fallback',
        }

    if any(token in lowered for token in ('availab', 'coverage', 'missing day', 'date range')):
        dataset = 'realtime'
        if 'gis' in lowered:
            dataset = 'gis'
        elif 'prediction' in lowered:
            dataset = 'predictions'
        result = tool_get_data_availability({'dam_id': dam_id or 'all', 'dataset': dataset})
        if result.get('error'):
            return {'reply': result['error'], 'attachments': [], 'provider': 'fallback'}
        return {
            'reply': (
                f"{result['dataset']} coverage for {result['damId']}: {result['coverage']}. "
                f"Earliest {result.get('earliestDate') or '-'}, latest {result.get('latestDate') or '-'}."
            ),
            'attachments': [],
            'provider': 'fallback',
        }

    if any(token in lowered for token in ('history', 'trend', 'summary', 'average', 'last 24', '24h', '7d')):
        if not dam_id:
            return {
                'reply': 'Please specify a dam name (for example Isimba or Nalubaale) for history summaries.',
                'attachments': [],
                'provider': 'fallback',
            }
        range_key = '24h'
        for candidate in ('1h', '6h', '24h', '7d'):
            if candidate in lowered:
                range_key = candidate
                break
        result = tool_get_dam_history({'dam_id': dam_id, 'range': range_key})
        if result.get('error') or result.get('sampleCount', 0) == 0:
            return {
                'reply': result.get('message') or result.get('error') or 'No history available.',
                'attachments': [],
                'provider': 'fallback',
            }
        wl = result['reservoirWaterLevel_m']
        unavailable = ', '.join(result.get('unavailableSensors') or [])
        return {
            'reply': (
                f"{result['name']} {result['range']} summary ({result['sampleCount']} samples): "
                f"reservoir avg {wl['avg']} m (min {wl['min']}, max {wl['max']}, latest {wl['latest']}). "
                f"Precipitation total {result['precipitation_mm']['total']} mm. "
                f"Unavailable sensors: {unavailable or 'none'}."
            ),
            'attachments': [],
            'provider': 'fallback',
        }

    if dam_id or any(token in lowered for token in ('latest', 'current', 'now', 'status', 'level', 'reading')):
        if not dam_id:
            dams = tool_list_dams()['dams']
            if not dams:
                return {'reply': 'No dams are configured in Hydro-M yet.', 'attachments': [], 'provider': 'fallback'}
            dam_id = dams[0]['id']
        result = tool_get_dam_latest({'dam_id': dam_id})
        if result.get('error'):
            return {'reply': result['error'], 'attachments': [], 'provider': 'fallback'}
        if not result.get('metrics'):
            return {
                'reply': result.get('message') or 'No realtime data available.',
                'attachments': [],
                'provider': 'fallback',
            }
        metrics = result['metrics']
        head = metrics['headRaceWaterLevel_m']
        tail = metrics['tailRaceWaterLevel_m']
        head_text = f'{head} m' if head is not None else 'not available'
        tail_text = f'{tail} m' if tail is not None else 'not available'
        return {
            'reply': (
                f"{result['name']} latest reading at {result['timestamp']}: "
                f"reservoir {metrics['reservoirWaterLevel_m']} m, "
                f"head race {head_text}, "
                f"tail race {tail_text}, "
                f"humidity {metrics['humidity_percent']}%, "
                f"temperature {metrics['temperature_c']}°C, "
                f"precipitation {metrics['precipitation_mm']} mm. "
                f"Dispatch and discharge are not available."
            ),
            'attachments': [],
            'provider': 'fallback',
        }

    return {
        'reply': (
            'I can help with dam status, history summaries, data availability, and CSV report generation. '
            'Try: "List dams", "Latest Isimba levels", "24h summary for Nalubaale", '
            'or "Generate realtime report for all dams".'
        ),
        'attachments': [],
        'provider': 'fallback',
    }


def _attachments_from_tool_result(result: dict) -> list[dict]:
    if not isinstance(result, dict):
        return []
    if result.get('downloadPath') and result.get('filename'):
        return [{
            'type': 'report',
            'filename': result['filename'],
            'downloadPath': result['downloadPath'],
            'label': f"Download {result.get('dataset', 'Hydro-M')} report",
        }]
    return []


def run_openai_assistant(messages: list[dict]) -> dict:
    from openai import OpenAI

    api_key = getattr(settings, 'OPENAI_API_KEY', '') or ''
    model = getattr(settings, 'OPENAI_MODEL', 'gpt-4o-mini')
    client = OpenAI(api_key=api_key)

    openai_messages = [{'role': 'system', 'content': SYSTEM_PROMPT}]
    for item in messages:
        role = item.get('role')
        content = item.get('content') or item.get('text') or ''
        if role in ('user', 'assistant') and content:
            openai_messages.append({'role': role, 'content': content})

    attachments: list[dict] = []
    max_rounds = 4

    for _ in range(max_rounds):
        completion = client.chat.completions.create(
            model=model,
            messages=openai_messages,
            tools=OPENAI_TOOLS,
            tool_choice='auto',
            temperature=0.2,
        )
        choice = completion.choices[0].message
        tool_calls = choice.tool_calls or []

        if not tool_calls:
            reply = (choice.content or '').strip() or 'I could not produce an answer from the available Hydro-M data.'
            return {'reply': reply, 'attachments': attachments, 'provider': 'openai'}

        openai_messages.append({
            'role': 'assistant',
            'content': choice.content or '',
            'tool_calls': [
                {
                    'id': call.id,
                    'type': 'function',
                    'function': {
                        'name': call.function.name,
                        'arguments': call.function.arguments or '{}',
                    },
                }
                for call in tool_calls
            ],
        })

        for call in tool_calls:
            result = run_tool(call.function.name, call.function.arguments)
            attachments.extend(_attachments_from_tool_result(result))
            openai_messages.append({
                'role': 'tool',
                'tool_call_id': call.id,
                'content': json.dumps(result),
            })

    return {
        'reply': 'I reached the tool-call limit before finishing. Please ask a more specific question.',
        'attachments': attachments,
        'provider': 'openai',
    }


def run_assistant(messages: list[dict]) -> dict:
    """
    messages: [{role: 'user'|'assistant', content: '...'}]
    """
    if not messages:
        return {
            'reply': 'Ask me about dam status, history, availability, or report generation.',
            'attachments': [],
            'provider': 'fallback',
        }

    latest_user = ''
    for item in reversed(messages):
        if item.get('role') == 'user':
            latest_user = item.get('content') or item.get('text') or ''
            break

    api_key = getattr(settings, 'OPENAI_API_KEY', '') or ''
    if not api_key:
        return run_fallback_assistant(latest_user)

    try:
        return run_openai_assistant(messages)
    except Exception as exc:  # noqa: BLE001
        fallback = run_fallback_assistant(latest_user)
        fallback['reply'] = (
            f"{fallback['reply']}\n\n(Note: OpenAI request failed, used database fallback. {exc})"
        )
        fallback['provider'] = 'fallback'
        return fallback


def resolve_report_file(filename: str) -> Path | None:
    safe_name = Path(filename).name
    if not re.fullmatch(r'[A-Za-z0-9._-]+', safe_name):
        return None
    path = Path(settings.MEDIA_ROOT) / 'assistant_reports' / safe_name
    if not path.exists() or not path.is_file():
        return None
    return path
