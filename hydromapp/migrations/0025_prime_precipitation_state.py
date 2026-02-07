# Data migration: Prime DamPrecipitationState from existing data
# Existing RealTimeSensorData had cumulative precipitation; use it to initialize state

from django.db import migrations


def prime_precipitation_state(apps, schema_editor):
    DamPrecipitationState = apps.get_model('hydromapp', 'DamPrecipitationState')
    Dam = apps.get_model('hydromapp', 'Dam')
    RealTimeSensorData = apps.get_model('hydromapp', 'RealTimeSensorData')

    for dam in Dam.objects.all():
        latest = RealTimeSensorData.objects.filter(dam=dam).order_by('-timestamp').first()
        if latest:
            DamPrecipitationState.objects.update_or_create(
                dam=dam,
                defaults={'last_cumulative': latest.precipitation}
            )


def reverse_prime(apps, schema_editor):
    # No-op on reverse; state will be recreated on next data ingest
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('hydromapp', '0024_add_dam_precipitation_state'),
    ]

    operations = [
        migrations.RunPython(prime_precipitation_state, reverse_prime),
    ]
