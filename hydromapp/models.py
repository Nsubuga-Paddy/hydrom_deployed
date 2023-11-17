from django.db import models


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

    PRIORITY_CHOICES = (
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    )

    dam = models.ForeignKey(Dam, on_delete=models.CASCADE)
    priority = models.CharField(max_length=6, choices=PRIORITY_CHOICES, default='low')
    sensor_value = models.DecimalField(max_digits=10, decimal_places=2,default=0.0)
    custom_message_discharge = models.TextField(blank=True)
    custom_message_upstream = models.TextField(blank=True)
    custom_message_below_active = models.TextField(blank=True)
    custom_message_above_active = models.TextField(blank=True)

    #Handling discharge from upstream dam logic
    def check_upstream_discharge(self):
        upstream_dam_order = self.dam.order - 1
        upstream_dam = Dam.objects.filter(order=upstream_dam_order).first()

        if upstream_dam:
            # Check if there is a recent discharge record for the upstream dam
            upstream_discharge = RealTimeSensorData.objects.filter(dam=upstream_dam).order_by('-timestamp').first()
            
            if upstream_discharge: #If there is a recent discharge 
                return True
        return False

    #Handling active volume logic and discharge messages
    def __str__(self):
        if self.check_upstream_discharge():
            return f"{self.dam.name} - Upstream discharge detected: {self.custom_message_upstream}"

        #Refering to the active volume value 
        active_volume = self.dam.active_vol

        if self.sensor_value > active_volume:  # Define the upper limit for your use case
            message = self.custom_message_above_active
        elif self.sensor_value < active_volume:  # Define the lower limit for your use case
            message = self.custom_message_below_active
        else:
            # You can set a default message or leave it blank if there is no condition met
            message = "Sensor value within normal range."

        return f"{self.dam.name} - {message}" 
    
    
    #def send_notification(self):
        #subject = f'Notification - {self.dam.name}'
        #message = self.note_msg
        #email_from = settings.EMAIL_HOST_USER
        #recipient_list = [user.email for user in self.dam.users.all()]  # Assuming `users` is a related field for users associated with a dam.
        #send_mail(subject, message, email_from, recipient_list)
