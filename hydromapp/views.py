from .models import Dam, RealTimeSensorData, Notification, RemoteSensingData

#Importing random sensor data
from django.http import JsonResponse
import random
from django.shortcuts import render, get_object_or_404
from django.http import HttpResponse
from datetime import datetime, timedelta
import requests

from .forms import DamSelectionForm


# create a new view that retrieves the dams from the database and passes them to a context variable.


def home_view(request):
    return render(request, 'home2.html')

def about_us(request):
    return render(request, 'about-us.html')

def contact_us(request):
    return render(request, 'contact-us.html')

def help(request):
    return render(request, 'help.html')

#Real time view
def dam_realtime_view(request, dam_id):
    dam = get_object_or_404(Dam, pk=dam_id)
    context = {
        'current_dam_id': dam_id,
        'dam' : dam,
        }

    return render (request, 'dam_realtime.html', context)


#Remote sensing view
def dam_gis_view(request, dam_id):
    dam = get_object_or_404(Dam, pk=dam_id)

    # Check if the dam has latitude and longitude coordinates
    if dam.latitude is not None and dam.longitude is not None:
        # API endpoint for OpenWeatherMap
        api_key = 'd1b2cbbdbab1e370647d435e68edaf66'
        api_endpoint = f'http://api.openweathermap.org/data/2.5/weather'
        params = {
            'lat': dam.latitude,
            'lon': dam.longitude,
            'units': 'standard ',  # You can adjust units as needed
            'appid': api_key,
        }

        # Make the API request
        response = requests.get(api_endpoint, params=params)

        if response.status_code == 200:
            weather_data = response.json()
            
            # Extract relevant weather information
            temperature = weather_data['main']['temp']
            humidity = weather_data['main']['humidity']
            precipitation = weather_data['precipitation']['1h'] if 'precipitation' in weather_data else 0

            context = {
                'current_dam_id': dam_id,
                'dam': dam,
                'temperature': temperature,
                'humidity': humidity,
                'precipitation': precipitation,
            }
            return render(request, 'dam_gis.html', context)

    remote_sensing_data = RemoteSensingData.objects.filter(dam=dam).latest('timestamp')

    context = {
        'current_dam_id': dam_id,
        'dam': dam,
        'remote_sensing_data':remote_sensing_data,
        'temperature': None,
        'humidity': None,
        'precipitation': None,
    }
    return render(request, 'dam_gis.html', context)


#Predictions view
def dam_pred_view(request, dam_id):
    dam = get_object_or_404(Dam, pk=dam_id)
    context = {
        'current_dam_id': dam_id,
        'dam' : dam,
        }
    
    return render (request, 'dam_pred.html', context)


#Trigger for notifcations
def system_alarms(request):
    return render(request, 'notifications.html')

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


#Dam selection form view
def download_data_view(request):
    dams = Dam.objects.order_by('order')
    data_context = {}
    if request.method == 'POST':
        form = DamSelectionForm(request.POST)
        if form.is_valid():
            selected_dam = form.cleaned_data['dam']
            data_type = form.cleaned_data['data_type']
            start_date = form.cleaned_data['start_date']
            end_date = form.cleaned_data['end_date']

            # Filter the data based on the selected type and date range
            if data_type == 'realtime':
                data = RealTimeSensorData.objects.filter(dam=selected_dam, date__range=[start_date, end_date])
            
            elif data_type == 'gis':
                data = RemoteSensingData.objects.filter(dam=selected_dam, date__range=[start_date, end_date])

            data_context = {
                'selected_data': data
            }

    else:
        form = DamSelectionForm()


    context = {'dams': dams, 'form': form, **data_context}
    return render(request, 'download-data.html', context)

