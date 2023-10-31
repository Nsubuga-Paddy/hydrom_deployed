from django.db import models
from django.utils.text import slugify

#Defining a dam and its meta data
class Dam(models.Model):
    name = models.CharField(max_length=100)
    location = models.CharField(max_length=200)
    capacity = models.DecimalField(max_digits=10, decimal_places=2)
    active_vol = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    order = models.PositiveIntegerField()

    def __str__(self):
        return self.name

#realtime data
class RealTimeSensorData(models.Model):
    dam = models.ForeignKey(Dam, on_delete=models.CASCADE)
    timestamp = models.DateTimeField()
    waterlevel = models.PositiveIntegerField()
    dispatch = models.PositiveIntegerField()
    discharge = models.PositiveIntegerField()
    precipitation = models.DecimalField(max_digits=10, decimal_places=2)
    humidity = models.PositiveIntegerField()
    temperature = models.DecimalField(max_digits=5, decimal_places=2)

#remote sensing data     
class RemoteSensingData(models.Model):
    dam = models.ForeignKey(Dam, on_delete=models.CASCADE)
    timestamp = models.DateTimeField()
    waterlevel = models.PositiveIntegerField()
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
    sensor_value = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    note_msg = models.TextField(default="")

    def __str__(self):
        return f"{self.dam.name} - {self.sensor_value}"  
