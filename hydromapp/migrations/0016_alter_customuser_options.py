# Generated by Django 4.2.5 on 2024-02-10 03:09

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('hydromapp', '0015_alter_customuser_options_and_more'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='customuser',
            options={'verbose_name': 'user', 'verbose_name_plural': 'users'},
        ),
    ]
