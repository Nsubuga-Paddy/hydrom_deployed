from .models import Dam, RealTimeSensorData, Notification

#Importing random sensor data
from django.http import JsonResponse
import random
from django.shortcuts import render, get_object_or_404
from django.http import HttpResponse
from datetime import datetime, timedelta


# create a new view that retrieves the dams from the database and passes them to a context variable.


def home_view(request):
    dams = Dam.objects.all()
    context = {'dams': dams}
    return render(request, 'home2.html', context)

def about_us(request):
    dams = Dam.objects.order_by('order')
    context = {'dams': dams}
    return render(request, 'about-us.html', context)

def contact_us(request):
    dams = Dam.objects.order_by('order')
    context = {'dams': dams}
    return render(request, 'contact-us.html', context)

def download_data(request):
    dams = Dam.objects.order_by('order')
    context = {'dams': dams}
    return render(request, 'download-data.html', context)

def help(request):
    dams = Dam.objects.order_by('order')
    context = {'dams': dams}
    return render(request, 'help.html', context)

#Real time view
def dam_realtime_view(request, dam_id):
    dams = Dam.objects.order_by('order')
    context = {'dams': dams}
    
    dam = get_object_or_404(Dam, pk=dam_id)
    context['dam'] = dam

    return render (request, 'dam_realtime.html', context)

#Remote sensing view
def dam_gis_view(request, dam_id):
    dams = Dam.objects.order_by('order')
    context = {'dams': dams}
    
    dam = get_object_or_404(Dam, pk=dam_id)
    context['dam'] = dam
    
    return render (request, 'dam_gis.html', context)


#Trigger for notifcations
def note_trigger(dam, sensor_value):
    pass

#Function to generate and store the random data in the database
def generate_random_sensor_data(request):
    current_time = datetime.now()

    #Getting the dam instance for Isimba Dam
    isimba_dam, created = Dam.objects.get_or_create(
        name = "Isimba HPP",
        location = "Kayunga District",
        capacity = "400",
        order = "5"
    )

    for _ in range(10):
        sensor_data = RealTimeSensorData(
            dam=isimba_dam,
            timestamp=current_time,
            waterlevel=random.randint(2000,3000),
            dispatch=random.randint(300, 500),
            discharge=random.randint(1000, 2000),
            precipitation=random.uniform(200,1000),
            humidity=random.randint(20,70),
            temperature=random.uniform(10, 30)
        )
        sensor_data.save()

        current_time -= timedelta(minutes=1) #Simulate data every 1 minute
    
    return JsonResponse({'message':'Data saved successfully'})


#retrieving data from the database and pass it to the home2.html template
def sensor_data_display(request):
    #retrieveing sensor data for Isimba Dam
    isimba_dam = Dam.objects.get(name = "Isimba HPP")
    sensor_data = RealTimeSensorData.objects.filter(dam=isimba_dam).order_by('-timestamp')[:10]

    context = {
        'isimba_dam': isimba_dam,
        'sensor_data': sensor_data,
    }

    return render(request, 'home2.html', context)


