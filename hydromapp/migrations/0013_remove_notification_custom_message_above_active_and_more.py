# Generated by Django 4.2.5 on 2023-12-31 14:21

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('hydromapp', '0012_remove_notification_notification_sent_and_more'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='notification',
            name='custom_message_above_active',
        ),
        migrations.RemoveField(
            model_name='notification',
            name='custom_message_below_active',
        ),
        migrations.RemoveField(
            model_name='notification',
            name='custom_message_discharge',
        ),
    ]
