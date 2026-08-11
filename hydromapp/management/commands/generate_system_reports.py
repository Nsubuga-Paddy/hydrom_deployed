from django.core.management.base import BaseCommand

from hydromapp.models import SystemReport
from hydromapp.report_service import (
    backfill_reports_from_data,
    generate_system_report,
    previous_month_bounds,
    previous_week_bounds,
)


class Command(BaseCommand):
    help = 'Generate System Generated Reports (weekly/monthly PDFs).'

    def add_arguments(self, parser):
        parser.add_argument(
            '--period',
            choices=['weekly', 'monthly', 'both', 'backfill'],
            default='both',
            help='Which reports to generate. Use backfill to cover all periods with data.',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Regenerate even if a PDF already exists for the period.',
        )

    def handle(self, *args, **options):
        period = options['period']
        force = options['force']

        if period == 'backfill':
            reports = backfill_reports_from_data(force=force)
            self.stdout.write(self.style.SUCCESS(f'Generated/updated {len(reports)} report(s).'))
            for report in reports:
                self.stdout.write(f' - [{report.status}] {report.title}')
            return

        targets = []
        if period in ('weekly', 'both'):
            start, end = previous_week_bounds()
            targets.append((SystemReport.PERIOD_WEEKLY, start, end))
        if period in ('monthly', 'both'):
            start, end = previous_month_bounds()
            targets.append((SystemReport.PERIOD_MONTHLY, start, end))

        for period_type, start, end in targets:
            report = generate_system_report(period_type, start, end, force=force)
            self.stdout.write(
                self.style.SUCCESS(f'[{report.status}] {report.title} (id={report.id})')
            )
