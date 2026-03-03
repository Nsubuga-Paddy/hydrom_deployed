# Water level: 2 → 3 decimal places (sensor sends 3 decimals)

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('hydromapp', '0025_prime_precipitation_state'),
    ]

    operations = [
        migrations.AlterField(
            model_name='realtimesensordata',
            name='waterlevel',
            field=models.DecimalField(decimal_places=3, help_text='Water level in meters', max_digits=10),
        ),
        migrations.AlterField(
            model_name='remotesensingdata',
            name='waterlevel',
            field=models.DecimalField(decimal_places=3, help_text='Water level in meters', max_digits=10),
        ),
        migrations.AlterField(
            model_name='prediction',
            name='waterlevel_prediction',
            field=models.DecimalField(decimal_places=3, max_digits=10),
        ),
    ]
