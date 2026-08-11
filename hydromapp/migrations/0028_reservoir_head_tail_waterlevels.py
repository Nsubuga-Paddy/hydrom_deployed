from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('hydromapp', '0027_feedback_submission'),
    ]

    operations = [
        migrations.RenameField(
            model_name='realtimesensordata',
            old_name='waterlevel',
            new_name='reservoir_waterlevel',
        ),
        migrations.AlterField(
            model_name='realtimesensordata',
            name='reservoir_waterlevel',
            field=models.DecimalField(
                decimal_places=3,
                help_text='Reservoir water level at the dam in meters',
                max_digits=10,
            ),
        ),
        migrations.AddField(
            model_name='realtimesensordata',
            name='head_race_waterlevel',
            field=models.DecimalField(
                blank=True,
                decimal_places=3,
                help_text='Head-race water level upstream of the reservoir in meters',
                max_digits=10,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='realtimesensordata',
            name='tail_race_waterlevel',
            field=models.DecimalField(
                blank=True,
                decimal_places=3,
                help_text='Tail-race water level downstream of the dam in meters',
                max_digits=10,
                null=True,
            ),
        ),
    ]
