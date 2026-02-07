"""
Management command to delete sensor data before a cutoff date.
Keeps only data from 1st August 2026 onwards.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import datetime

from hydromapp.models import RealTimeSensorData, RemoteSensingData, Prediction


class Command(BaseCommand):
    help = 'Delete all data before 1st August 2025. Keeps data from 2025-08-01 onwards.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )

    def handle(self, *args, **options):
        # Cutoff: 1st August 2025 00:00:00 (timezone-aware)
        cutoff_date = datetime(2025, 8, 1, 0, 0, 0)
        cutoff = timezone.make_aware(cutoff_date, timezone.get_current_timezone())

        dry_run = options['dry_run']

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN - No data will be deleted'))

        # RealTimeSensorData
        rt_count = RealTimeSensorData.objects.filter(timestamp__lt=cutoff).count()
        if rt_count > 0:
            if dry_run:
                self.stdout.write(f'Would delete {rt_count} RealTimeSensorData records')
            else:
                deleted, _ = RealTimeSensorData.objects.filter(timestamp__lt=cutoff).delete()
                self.stdout.write(self.style.SUCCESS(f'Deleted {deleted} RealTimeSensorData records'))

        # RemoteSensingData
        rs_count = RemoteSensingData.objects.filter(timestamp__lt=cutoff).count()
        if rs_count > 0:
            if dry_run:
                self.stdout.write(f'Would delete {rs_count} RemoteSensingData records')
            else:
                deleted, _ = RemoteSensingData.objects.filter(timestamp__lt=cutoff).delete()
                self.stdout.write(self.style.SUCCESS(f'Deleted {deleted} RemoteSensingData records'))

        # Prediction
        pred_count = Prediction.objects.filter(timestamp__lt=cutoff).count()
        if pred_count > 0:
            if dry_run:
                self.stdout.write(f'Would delete {pred_count} Prediction records')
            else:
                deleted, _ = Prediction.objects.filter(timestamp__lt=cutoff).delete()
                self.stdout.write(self.style.SUCCESS(f'Deleted {deleted} Prediction records'))

        if dry_run:
            self.stdout.write(self.style.SUCCESS('Dry run complete. Run without --dry-run to delete.'))
        else:
            self.stdout.write(self.style.SUCCESS('Data cleanup complete.'))
