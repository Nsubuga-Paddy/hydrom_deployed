# Generated by Django 4.2.5 on 2023-09-20 17:21

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('hydromapp', '0002_dam_order'),
    ]

    operations = [
        migrations.AlterField(
            model_name='dam',
            name='order',
            field=models.IntegerField(),
        ),
    ]
