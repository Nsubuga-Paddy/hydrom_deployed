from celery import shared_task

from .models import SystemReport
from .report_service import generate_system_report, previous_month_bounds, previous_week_bounds


@shared_task(name='hydromapp.generate_weekly_system_report')
def generate_weekly_system_report(force: bool = False):
    start, end = previous_week_bounds()
    report = generate_system_report(SystemReport.PERIOD_WEEKLY, start, end, force=force)
    return {'id': report.id, 'title': report.title, 'status': report.status}


@shared_task(name='hydromapp.generate_monthly_system_report')
def generate_monthly_system_report(force: bool = False):
    start, end = previous_month_bounds()
    report = generate_system_report(SystemReport.PERIOD_MONTHLY, start, end, force=force)
    return {'id': report.id, 'title': report.title, 'status': report.status}
