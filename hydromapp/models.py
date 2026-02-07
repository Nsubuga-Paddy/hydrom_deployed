from django.db import models
from django.conf import settings
from django.core.mail import send_mail
from django.contrib.auth import get_user_model 
import pytz

from django import forms
from django.core.validators import RegexValidator
import uuid

from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

#from django.contrib.auth.models import AbstractUser

#Defining a dam and its meta data
class Dam(models.Model):
    name = models.CharField(max_length=100)
    location = models.CharField(max_length=200)
    capacity = models.DecimalField(max_digits=10, decimal_places=2)
    active_vol = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    order = models.PositiveIntegerField()


    latitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    
    def __str__(self):
        return self.name

#Creating a model for users to register
class UserProfile(models.Model):
    user  = models.OneToOneField(User, on_delete=models.CASCADE)
    phone_number = models.CharField(
        max_length = 10,
        validators=[
        RegexValidator(regex=r'^\d{10}$', message='Phone number must be exactly 10 digits.')
    ])
    dam = models.ForeignKey(Dam, on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return self.user.username

@receiver(post_save, sender=User)
def create_or_update_user_profile (sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)
    instance.userprofile.save()


# Tracks last cumulative precipitation per dam (for computing delta on next incoming reading)
class DamPrecipitationState(models.Model):
    dam = models.OneToOneField(Dam, on_delete=models.CASCADE, primary_key=True)
    last_cumulative = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.dam.name}: {self.last_cumulative}"


#realtime data
class RealTimeSensorData(models.Model):
    dam = models.ForeignKey(Dam, on_delete=models.CASCADE)
    timestamp = models.DateTimeField(auto_now_add=True)
    waterlevel = models.DecimalField(max_digits=10, decimal_places=2, help_text="Water level in meters")
    dispatch = models.PositiveIntegerField()
    discharge = models.PositiveIntegerField()
    precipitation = models.DecimalField(max_digits=10, decimal_places=2, help_text="Precipitation delta in mm (distinct value per interval)")
    humidity = models.PositiveIntegerField()
    temperature = models.DecimalField(max_digits=5, decimal_places=2)

#remote sensing data     
class RemoteSensingData(models.Model):
    dam = models.ForeignKey(Dam, on_delete=models.CASCADE)
    timestamp = models.DateTimeField()
    waterlevel = models.DecimalField(max_digits=10, decimal_places=2, help_text="Water level in meters")
    precipitation = models.DecimalField(max_digits=10, decimal_places=2)
    humidity = models.PositiveIntegerField()
    temperature = models.DecimalField(max_digits=5, decimal_places=2)

#prediction data
class Prediction(models.Model):
    dam = models.ForeignKey(Dam, on_delete=models.CASCADE)
    timestamp = models.DateTimeField()
    waterlevel_prediction = models.DecimalField(max_digits=10, decimal_places=2)

#notifications model that allows notifications based on sensor data
class Notification(models.Model):

    dam = models.ForeignKey(Dam, on_delete=models.CASCADE)

    #Method to check condition and send notification
    def check_conditions_and_notify(self):
        self.check_and_notify_discharge() #Check for dam discharge
        self.check_and_notify_water_level() #Check for water level relative to the active volume

    def check_and_notify_discharge(self):
        latest_data = RealTimeSensorData.objects.filter(dam=self.dam).order_by('-timestamp').first()
        if latest_data and latest_data.discharge > 0 and not self.notification_sent:
            
            local_timezone = pytz.timezone('GMT+3')
            local_time = latest_data.timestamp.astimezone(local_timezone).strftime("%Y-%m-%d %H:%M:%S")

            message = "{} has discharged {} cubic meters at {}".format(self.dam.name, latest_data.discharge, local_time)
            self.send_notification(message)
            self.notification_sent = True
            self.save()

    def check_and_notify_water_level(self):
        latest_data = RealTimeSensorData.objects.filter(dam=self.dam).order_by('-timestamp').first()

        local_timezone = pytz.timezone('GMT+3')
        local_time = latest_data.timestamp.astimezone(local_timezone).strftime("%Y-%m-%d %H:%M:%S")

        if latest_data:
            if latest_data.waterlevel > self.dam.active_vol and not self.notification_sent:
                message = "{} water level in the reservior is above active volume of {} at {}".format(self.dam.name, self.dam.active_vol, local_time)
                self.send_notification(message)
                self.notification_sent = True
                self.save()
            elif latest_data.waterlevel < self.dam.active_vol and not self.notification_sent:
                message = "{} water level in the reservior is below active volume of {} at {}".format(self.dam.name, self.dam.active_vol, local_time)
                self.send_notification(message)
                self.notification_sent = True
                self.save()

    def send_notification(self, message):
        #Fetching all user emails
        User = get_user_model()
        all_users = User.objects.all()
        email_list = [user.email for user in all_users if user.email]

        #Sending email to all users
        if email_list:
            send_mail(
                'Dam Alert Notification',
                message,
                settings.EMAIL_HOST_USER,
                email_list,
                fail_silently = False,
            )
