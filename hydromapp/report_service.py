"""
System Generated Reports (SGR): deterministic titles/stats + optional AI narrative + PDF.
"""

from __future__ import annotations

import calendar
import io
import statistics
from datetime import date, datetime, timedelta
from django.conf import settings
from django.core.files.base import ContentFile
from django.db.models import Avg, Count, Max, Min, Sum
from django.utils import timezone

from .models import Dam, RealTimeSensorData, SystemReport

PARTIAL_COMPLETENESS_THRESHOLD = 85
EXPECTED_SAMPLES_PER_DAY = 24  # assume roughly hourly telemetry


def previous_week_bounds(ref: date | None = None) -> tuple[date, date]:
    ref = ref or timezone.localdate()
    # Previous Monday–Sunday
    this_monday = ref - timedelta(days=ref.weekday())
    end = this_monday - timedelta(days=1)
    start = end - timedelta(days=6)
    return start, end


def previous_month_bounds(ref: date | None = None) -> tuple[date, date]:
    ref = ref or timezone.localdate()
    first_this_month = ref.replace(day=1)
    end = first_this_month - timedelta(days=1)
    start = end.replace(day=1)
    return start, end


def build_report_title(period_type: str, start: date, end: date) -> str:
    if period_type == SystemReport.PERIOD_MONTHLY:
        return f'Monthly Cascade Operations Summary - {start.strftime("%B %Y")}'
    return (
        'Weekly Cascade Operations Summary - '
        f'{start.strftime("%d %b")} to {end.strftime("%d %b %Y")}'
    )


def _optional_stats(values: list[float]) -> dict | None:
    if not values:
        return None
    return {
        'min': round(min(values), 3),
        'max': round(max(values), 3),
        'avg': round(statistics.fmean(values), 3),
        'latest': round(values[-1], 3),
        'delta': round(values[-1] - values[0], 3),
    }


def _detect_gaps(timestamps: list[datetime], max_gap_hours: float = 6.0) -> list[str]:
    if len(timestamps) < 2:
        return []
    gaps = []
    ordered = sorted(timestamps)
    for prev, curr in zip(ordered, ordered[1:]):
        delta_h = (curr - prev).total_seconds() / 3600.0
        if delta_h >= max_gap_hours:
            gaps.append(
                f'{prev.strftime("%d %b %H:%M")}–{curr.strftime("%d %b %H:%M")} '
                f'({delta_h:.1f}h gap)'
            )
    return gaps[:5]


def build_period_summary(period_type: str, start: date, end: date) -> dict:
    dams = list(Dam.objects.all().order_by('order', 'id'))
    day_count = (end - start).days + 1
    expected_per_dam = max(day_count * EXPECTED_SAMPLES_PER_DAY, 1)

    dam_rows = []
    highlights: list[str] = []
    completeness_scores: list[float] = []
    dams_with_data = 0

    # Cascade-level sensor availability flags
    any_head = False
    any_tail = False

    for dam in dams:
        qs = RealTimeSensorData.objects.filter(
            dam=dam,
            timestamp__date__gte=start,
            timestamp__date__lte=end,
        ).order_by('timestamp')
        sample_count = qs.count()
        agg = qs.aggregate(
            reservoir_min=Min('reservoir_waterlevel'),
            reservoir_max=Max('reservoir_waterlevel'),
            reservoir_avg=Avg('reservoir_waterlevel'),
            precip_total=Sum('precipitation'),
            humidity_avg=Avg('humidity'),
            temperature_avg=Avg('temperature'),
            head_count=Count('head_race_waterlevel'),
            tail_count=Count('tail_race_waterlevel'),
        )

        entries = list(qs.only(
            'timestamp',
            'reservoir_waterlevel',
            'head_race_waterlevel',
            'tail_race_waterlevel',
        ))
        reservoir_values = [float(e.reservoir_waterlevel) for e in entries]
        head_values = [
            float(e.head_race_waterlevel)
            for e in entries
            if e.head_race_waterlevel is not None
        ]
        tail_values = [
            float(e.tail_race_waterlevel)
            for e in entries
            if e.tail_race_waterlevel is not None
        ]
        timestamps = [
            timezone.localtime(e.timestamp) if timezone.is_aware(e.timestamp) else e.timestamp
            for e in entries
        ]

        completeness = min(100.0, round((sample_count / expected_per_dam) * 100, 1))
        completeness_scores.append(completeness)
        if sample_count > 0:
            dams_with_data += 1

        if head_values:
            any_head = True
        if tail_values:
            any_tail = True

        gap_labels = _detect_gaps(timestamps)
        dam_highlights = []
        if sample_count == 0:
            dam_highlights.append(f'{dam.name}: no samples in period')
            highlights.append(f'{dam.name}: no samples in period')
        elif completeness < PARTIAL_COMPLETENESS_THRESHOLD:
            dam_highlights.append(f'{dam.name}: completeness {completeness:.0f}%')
            highlights.append(f'{dam.name}: completeness {completeness:.0f}%')
        for gap in gap_labels:
            label = f'{dam.name}: gap {gap}'
            dam_highlights.append(label)
            if len(highlights) < 12:
                highlights.append(label)

        dam_rows.append({
            'damId': dam.id,
            'name': dam.name,
            'location': dam.location,
            'sampleCount': sample_count,
            'completenessPercent': completeness,
            'reservoir': _optional_stats(reservoir_values) or (
                {
                    'min': float(agg['reservoir_min']) if agg['reservoir_min'] is not None else None,
                    'max': float(agg['reservoir_max']) if agg['reservoir_max'] is not None else None,
                    'avg': round(float(agg['reservoir_avg']), 3) if agg['reservoir_avg'] is not None else None,
                    'latest': None,
                    'delta': None,
                }
                if sample_count
                else None
            ),
            'headRace': _optional_stats(head_values),
            'tailRace': _optional_stats(tail_values),
            'precipitationTotalMm': (
                round(float(agg['precip_total']), 2) if agg['precip_total'] is not None else 0.0
            ),
            'humidityAvg': (
                round(float(agg['humidity_avg']), 2) if agg['humidity_avg'] is not None else None
            ),
            'temperatureAvgC': (
                round(float(agg['temperature_avg']), 2)
                if agg['temperature_avg'] is not None
                else None
            ),
            'gaps': gap_labels,
            'notes': dam_highlights,
        })

    if not any_head:
        highlights.insert(0, 'Head race sensors not installed or have no readings')
    if not any_tail:
        highlights.insert(0 if not any_head else 1, 'Tail race sensors not installed or have no readings')
    highlights.append('Dispatch and discharge sensors are not installed')

    overall_completeness = (
        int(round(statistics.fmean(completeness_scores))) if completeness_scores else 0
    )

    return {
        'periodType': period_type,
        'periodStart': start.isoformat(),
        'periodEnd': end.isoformat(),
        'dayCount': day_count,
        'expectedSamplesPerDam': expected_per_dam,
        'damsCovered': dams_with_data,
        'damCount': len(dams),
        'completenessPercent': overall_completeness,
        'missingDataHighlights': highlights[:15],
        'sensors': {
            'reservoir': 'measured',
            'headRace': 'available' if any_head else 'unavailable',
            'tailRace': 'available' if any_tail else 'unavailable',
            'dispatch': 'unavailable',
            'discharge': 'unavailable',
        },
        'dams': dam_rows,
    }


def build_template_summary(summary: dict) -> str:
    period_type = summary['periodType']
    start = summary['periodStart']
    end = summary['periodEnd']
    completeness = summary['completenessPercent']
    dams_covered = summary['damsCovered']
    dam_count = summary['damCount']

    reservoir_bits = []
    for dam in summary['dams']:
        reservoir = dam.get('reservoir')
        if not reservoir or reservoir.get('avg') is None:
            continue
        reservoir_bits.append(
            f"{dam['name']} avg {reservoir['avg']:.3f} m "
            f"(min {reservoir['min']:.3f}, max {reservoir['max']:.3f})"
        )

    label = 'week' if period_type == 'weekly' else 'month'
    parts = [
        f'Hydro-M {label}ly cascade summary for {start} to {end}.',
        f'Data available for {dams_covered} of {dam_count} dams; overall completeness {completeness}%.',
    ]
    if reservoir_bits:
        parts.append('Reservoir levels: ' + '; '.join(reservoir_bits) + '.')
    else:
        parts.append('No reservoir readings were available in this period.')

    unavailable = [
        name
        for name, state in summary['sensors'].items()
        if state == 'unavailable' and name != 'reservoir'
    ]
    if unavailable:
        parts.append('Unavailable sensors: ' + ', '.join(unavailable) + '.')

    if completeness < PARTIAL_COMPLETENESS_THRESHOLD:
        parts.append(
            'This report is marked partial because sample coverage is below the operating threshold.'
        )
    else:
        parts.append('Installed-sensor coverage met the completeness threshold for this period.')

    return ' '.join(parts)


def polish_summary_with_openai(summary: dict, template_text: str) -> tuple[str, str]:
    api_key = getattr(settings, 'OPENAI_API_KEY', '') or ''
    if not api_key.strip():
        return template_text, 'template'

    try:
        from openai import OpenAI

        client = OpenAI(api_key=api_key)
        model = getattr(settings, 'OPENAI_MODEL', 'gpt-4o-mini')
        prompt = (
            'Rewrite this Hydro-M dam operations summary for UEGCL staff. '
            'Keep it concise (120-180 words), factual, and operational. '
            'Do not invent readings, dams, dates, or events. '
            'Mention missing sensors and completeness if present.\n\n'
            f'Template summary:\n{template_text}\n\n'
            f'Structured stats JSON:\n{summary}'
        )
        response = client.chat.completions.create(
            model=model,
            messages=[
                {
                    'role': 'system',
                    'content': (
                        'You are a hydropower operations report writer. '
                        'Use only provided facts.'
                    ),
                },
                {'role': 'user', 'content': prompt},
            ],
            temperature=0.2,
        )
        text = (response.choices[0].message.content or '').strip()
        if not text:
            return template_text, 'template'
        return text, 'openai'
    except Exception:  # noqa: BLE001
        return template_text, 'template'


def render_report_pdf(report: SystemReport, summary: dict, narrative: str) -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import cm
    from reportlab.platypus import (
        Paragraph,
        SimpleDocTemplate,
        Spacer,
        Table,
        TableStyle,
    )

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=1.6 * cm,
        rightMargin=1.6 * cm,
        topMargin=1.6 * cm,
        bottomMargin=1.6 * cm,
        title=report.title,
    )
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='CoverTitle', parent=styles['Title'], fontSize=18, spaceAfter=8))
    styles.add(ParagraphStyle(name='Section', parent=styles['Heading2'], fontSize=13, spaceBefore=12, spaceAfter=6))
    styles.add(ParagraphStyle(name='BodyJust', parent=styles['BodyText'], alignment=TA_JUSTIFY, leading=14))
    styles.add(ParagraphStyle(name='Meta', parent=styles['Normal'], textColor=colors.HexColor('#475569'), fontSize=9))
    styles.add(ParagraphStyle(name='Small', parent=styles['Normal'], fontSize=8.5, leading=11))

    story = []
    story.append(Paragraph('UEGCL Hydro-M', styles['Meta']))
    story.append(Paragraph(report.title, styles['CoverTitle']))
    story.append(
        Paragraph(
            f'Period: {report.period_start.isoformat()} to {report.period_end.isoformat()} '
            f'&nbsp;|&nbsp; Status: {report.get_status_display()} '
            f'&nbsp;|&nbsp; Completeness: {report.completeness_percent}%',
            styles['Meta'],
        )
    )
    story.append(Spacer(1, 0.35 * cm))

    story.append(Paragraph('1. Executive summary', styles['Section']))
    story.append(Paragraph(narrative.replace('\n', '<br/>'), styles['BodyJust']))

    story.append(Paragraph('2. Cascade KPI overview', styles['Section']))
    table_data = [[
        'Dam',
        'Samples',
        'Complete %',
        'Res. avg (m)',
        'Res. min',
        'Res. max',
        'Precip (mm)',
    ]]
    for dam in summary.get('dams', []):
        reservoir = dam.get('reservoir') or {}
        table_data.append([
            dam.get('name', '—'),
            str(dam.get('sampleCount', 0)),
            f"{dam.get('completenessPercent', 0):.0f}",
            '—' if reservoir.get('avg') is None else f"{reservoir['avg']:.3f}",
            '—' if reservoir.get('min') is None else f"{reservoir['min']:.3f}",
            '—' if reservoir.get('max') is None else f"{reservoir['max']:.3f}",
            f"{dam.get('precipitationTotalMm', 0):.2f}",
        ])

    table = Table(table_data, repeatRows=1)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0896fc')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.3, colors.HexColor('#cbd5e1')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(table)

    story.append(Paragraph('3. Missing data & sensor status', styles['Section']))
    sensors = summary.get('sensors', {})
    story.append(
        Paragraph(
            'Sensor status — '
            f"reservoir: {sensors.get('reservoir', 'n/a')}; "
            f"head race: {sensors.get('headRace', 'n/a')}; "
            f"tail race: {sensors.get('tailRace', 'n/a')}; "
            f"dispatch: {sensors.get('dispatch', 'n/a')}; "
            f"discharge: {sensors.get('discharge', 'n/a')}.",
            styles['BodyJust'],
        )
    )
    highlights = summary.get('missingDataHighlights') or []
    if highlights:
        for item in highlights:
            story.append(Paragraph(f'• {item}', styles['Small']))
    else:
        story.append(Paragraph('No major data-quality issues were flagged for this period.', styles['BodyJust']))

    story.append(Paragraph('4. Notes', styles['Section']))
    story.append(
        Paragraph(
            'Titles and numerical values are system-generated from Hydro-M database records. '
            'Narrative text may be polished by AI from those audited statistics only. '
            f"Narrative provider: {report.narrative_provider or 'template'}. "
            'This PDF is intended for internal operational review.',
            styles['BodyJust'],
        )
    )
    story.append(Spacer(1, 0.4 * cm))
    generated = report.generated_at or timezone.now()
    story.append(
        Paragraph(
            f'Generated {timezone.localtime(generated).strftime("%Y-%m-%d %H:%M %Z")} by Hydro-M SGR.',
            styles['Meta'],
        )
    )

    doc.build(story)
    return buffer.getvalue()


def generate_system_report(
    period_type: str,
    start: date | None = None,
    end: date | None = None,
    *,
    force: bool = False,
    use_ai: bool = True,
) -> SystemReport:
    if period_type not in (SystemReport.PERIOD_WEEKLY, SystemReport.PERIOD_MONTHLY):
        raise ValueError('period_type must be weekly or monthly')

    if start is None or end is None:
        start, end = (
            previous_week_bounds()
            if period_type == SystemReport.PERIOD_WEEKLY
            else previous_month_bounds()
        )

    title = build_report_title(period_type, start, end)
    report, _created = SystemReport.objects.get_or_create(
        period_type=period_type,
        period_start=start,
        period_end=end,
        defaults={
            'title': title,
            'status': SystemReport.STATUS_GENERATING,
        },
    )

    if report.pdf_file and report.status in (
        SystemReport.STATUS_READY,
        SystemReport.STATUS_PARTIAL,
    ) and not force:
        return report

    report.title = title
    report.status = SystemReport.STATUS_GENERATING
    report.error_message = ''
    report.save(update_fields=['title', 'status', 'error_message', 'updated_at'])

    try:
        summary = build_period_summary(period_type, start, end)
        template_summary = build_template_summary(summary)
        if use_ai:
            narrative, provider = polish_summary_with_openai(summary, template_summary)
        else:
            narrative, provider = template_summary, 'template'

        completeness = int(summary['completenessPercent'])
        status = (
            SystemReport.STATUS_PARTIAL
            if completeness < PARTIAL_COMPLETENESS_THRESHOLD or summary['damsCovered'] == 0
            else SystemReport.STATUS_READY
        )

        report.summary_json = summary
        report.summary = narrative
        report.missing_data_highlights = summary.get('missingDataHighlights') or []
        report.completeness_percent = completeness
        report.dams_covered = int(summary.get('damsCovered') or 0)
        report.narrative_provider = provider
        report.status = status
        report.generated_at = timezone.now()
        report.save()

        pdf_bytes = render_report_pdf(report, summary, narrative)
        filename = (
            f'{period_type}_{start.isoformat()}_to_{end.isoformat()}.pdf'
        )
        if report.pdf_file:
            report.pdf_file.delete(save=False)
        report.pdf_file.save(filename, ContentFile(pdf_bytes), save=True)
        return report
    except Exception as exc:  # noqa: BLE001
        report.status = SystemReport.STATUS_FAILED
        report.error_message = str(exc)
        report.generated_at = timezone.now()
        report.save(update_fields=['status', 'error_message', 'generated_at', 'updated_at'])
        raise


def serialize_system_report(report: SystemReport, request=None) -> dict:
    pdf_url = None
    if report.pdf_file:
        url = report.pdf_file.url
        if request is not None:
            pdf_url = request.build_absolute_uri(url)
        else:
            pdf_url = url

    return {
        'id': report.id,
        'title': report.title,
        'periodType': report.period_type,
        'periodStart': report.period_start.isoformat(),
        'periodEnd': report.period_end.isoformat(),
        'generatedAt': (
            timezone.localtime(report.generated_at).isoformat()
            if report.generated_at
            else None
        ),
        'status': report.status,
        'completenessPercent': report.completeness_percent,
        'damsCovered': report.dams_covered,
        'missingDataHighlights': report.missing_data_highlights or [],
        'summary': report.summary or '',
        'narrativeProvider': report.narrative_provider or 'template',
        'pdfUrl': pdf_url,
        'downloadPath': f'/api/system-reports/{report.id}/pdf/' if report.pdf_file else None,
    }


def backfill_reports_from_data(
    *,
    force: bool = False,
    max_weeks: int = 8,
    max_months: int = 6,
) -> list[SystemReport]:
    """Generate recent weekly/monthly reports covered by stored realtime data."""
    earliest = RealTimeSensorData.objects.order_by('timestamp').values_list('timestamp', flat=True).first()
    latest = RealTimeSensorData.objects.order_by('-timestamp').values_list('timestamp', flat=True).first()
    if not earliest or not latest:
        return []

    start_day = timezone.localtime(earliest).date() if timezone.is_aware(earliest) else earliest.date()
    end_day = timezone.localtime(latest).date() if timezone.is_aware(latest) else latest.date()

    created: list[SystemReport] = []

    # Most recent complete weeks that overlap data (Mon-Sun)
    cursor = end_day - timedelta(days=end_day.weekday())  # Monday of latest week
    weeks_made = 0
    while cursor >= start_day - timedelta(days=6) and weeks_made < max_weeks:
        week_end = cursor + timedelta(days=6)
        if week_end >= start_day and cursor <= end_day:
            created.append(
                generate_system_report(
                    SystemReport.PERIOD_WEEKLY,
                    cursor,
                    week_end,
                    force=force,
                    use_ai=False,
                )
            )
            weeks_made += 1
        cursor -= timedelta(days=7)

    # Most recent months overlapping data
    year, month = end_day.year, end_day.month
    months_made = 0
    while date(year, month, 1) >= start_day.replace(day=1) and months_made < max_months:
        month_start = date(year, month, 1)
        month_end = date(year, month, calendar.monthrange(year, month)[1])
        if month_end >= start_day and month_start <= end_day:
            created.append(
                generate_system_report(
                    SystemReport.PERIOD_MONTHLY,
                    month_start,
                    month_end,
                    force=force,
                    use_ai=False,
                )
            )
            months_made += 1
        if month == 1:
            year -= 1
            month = 12
        else:
            month -= 1

    return created
