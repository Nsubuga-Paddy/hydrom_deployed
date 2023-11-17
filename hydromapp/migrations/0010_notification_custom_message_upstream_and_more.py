# Generated by Django 4.2.5 on 2023-11-15 02:33

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('hydromapp', '0009_remove_notification_sensor_value'),
    ]

    operations = [
        migrations.AddField(
            model_name='notification',
            name='custom_message_upstream',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='notification',
            name='sensor_value',
            field=models.DecimalField(decimal_places=2, default=0.0, max_digits=10),
        ),
    ]
