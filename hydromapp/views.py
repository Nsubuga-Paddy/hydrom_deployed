from .models import Dam, RealTimeSensorData, Notification, RemoteSensingData, Prediction

#Importing random sensor data
import random
from django.shortcuts import redirect, render, get_object_or_404
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt

from django.contrib import messages
from django.contrib.auth import authenticate, login, logout
from django.core.mail import send_mail
from django.urls import reverse
from django.conf import settings
import uuid

from .forms import CustomUserCreationForm
from .models import UserProfile
from django.contrib.auth.forms import UserCreationForm

from django.contrib.auth.decorators import login_required

import json
from datetime import datetime, timedelta
import requests

from .forms import DamSelectionForm, CustomUserCreationForm
import csv

from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from sklearn.preprocessing import MinMaxScaler
import numpy as np 
import pandas as pd 
from keras.models import model_from_json, load_model
import matplotlib.pyplot as plt
import io
import base64
# create a new view that retrieves the dams from the database and passes them to a context variable.

@login_required(login_url='login')
def home_view(request):
    return render(request, 'home2.html')

def about_us(request):
    return render(request, 'about-us.html')

def contact_us(request):
    return render(request, 'contact-us.html')

def help(request):
    return render(request, 'help.html')

#Real time view
@login_required(login_url='login')
def dam_realtime_view(request, dam_id):
    dam = get_object_or_404(Dam, pk=dam_id)

    latest_realtime_data = RealTimeSensorData.objects.filter(dam=dam).order_by('-timestamp').first()

    # Set the latest_realtime_data as an attribute of the dam object
    dam.latest_realtime_data = latest_realtime_data

    context = {
        'current_dam_id': dam_id,
        'dam' : dam,
        'latest_realtime_data' : latest_realtime_data,
        }

    return render (request, 'dam_realtime.html', context)

#Query the database for the last 20 realtime values
@login_required(login_url='login') 
def get_rt_sensor_data(request, dam_id):

    dam = get_object_or_404(Dam, pk=dam_id)

    rt_sensor_data = RealTimeSensorData.objects.filter(dam=dam).order_by('-timestamp')[:20]

    rt_data = {
        'timestamps': [entry.timestamp.strftime("%Y-%m-%d %H:%M:%S") for entry in rt_sensor_data],
        'waterlevels': [entry.waterlevel for entry in rt_sensor_data],
        'dispatchs': [entry.dispatch for entry in rt_sensor_data],
        'discharges': [entry.discharge for entry in rt_sensor_data],
        'precipitations': [entry.precipitation for entry in rt_sensor_data],
        'humiditys': [entry.humidity for entry in rt_sensor_data],
        'temperatures': [entry.temperature for entry in rt_sensor_data],
    }

    return JsonResponse(rt_data)


#Remote sensing view
@login_required(login_url='login')
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
@login_required(login_url='login')
def dam_pred_view(request, dam_id):
    dam = get_object_or_404(Dam, pk=dam_id)
    context = {
        'current_dam_id': dam_id,
        'dam' : dam,
        }
    
    return render (request, 'dam_pred.html', context)


#Trigger for notifcations with login required decorator 
@login_required(login_url='login')
def system_alarms(request):
    return render(request, 'notifications.html')

#Function to receive data from ESP32 to the database
@csrf_exempt
def store_data(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            dam_id = data.get('dam_id')
            temperature = float(data.get('temperature'))
            humidity = int(data.get('humidity'))
            waterlevel = int(data.get('waterlevel'))
            dispatch = int(data.get('dispatch'))
            discharge = int(data.get('discharge'))
            precipitation = float(data.get('precipitation'))
            timestamp = datetime.strptime(data.get('timestamp'), '%Y-%m-%dT%H:%M:%S')  # Adjust format as needed

            RealTimeSensorData.objects.create(
                dam_id=dam_id, 
                timestamp=timestamp, 
                temperature=temperature, 
                humidity=humidity, 
                waterlevel=waterlevel, 
                dispatch=dispatch, 
                discharge=discharge, 
                precipitation=precipitation
            )
            return HttpResponse('Data stored successfully.')
        except Exception as e:
            return JsonResponse({"error": str(e)})
    else:
        return HttpResponse('Invalid request method.')


#Download data view with login required decorator
@login_required(login_url='login')
def download_data_view(request):
    dams = Dam.objects.order_by('order')
    
    if request.method == 'POST':
        form = DamSelectionForm(request.POST)
        if form.is_valid():
            selected_dam = form.cleaned_data['dam']
            data_categories = form.cleaned_data['data_category']
            start_date = form.cleaned_data['start_date']
            end_date = form.cleaned_data['end_date']

            for data_type in data_categories:
                # Ensure start_date is at the beginning of the day and end_date covers the end of the day
                start_datetime = datetime.combine(start_date, datetime.min.time())
                end_datetime = datetime.combine(end_date, datetime.max.time())

                # Filter the data based on the selected type and date range
                if data_type == 'realtime':
                    data = RealTimeSensorData.objects.filter(dam=selected_dam, timestamp__range=[start_datetime, end_datetime])
                    model = RealTimeSensorData
                
                elif data_type == 'gis':
                    data = RemoteSensingData.objects.filter(dam=selected_dam, timestamp__range=[start_datetime, end_datetime])
                    model = RemoteSensingData
                
                elif data_type == 'prediction':
                    data = Prediction.objects.filter(dam=selected_dam, timestamp__range=[start_datetime, end_datetime])
                    model = Prediction

                if not data.exists():
                    # If no data is available, add a message and redirect or re-render the form page
                    messages.error(request, "No data available for the selected criteria.")
                    context= {'dams':dams, 'form':form}
                    return render(request, 'download-data.html', context)

                #Prepare HttpResponse
                response = HttpResponse(content_type = 'text/csv')
                response['Content-Disposition'] = f'attachement; filename="{data_type}_data.csv"'

                writer = csv.writer(response)

                # Get field names (headers) dynamically from the model
                if model:
                    field_names = [field.name for field in model._meta.fields]
                    writer.writerow(field_names)

                    # Write data rows
                    for item in data:
                        row_data = [getattr(item, field) for field in field_names]
                        writer.writerow(row_data)

                return response
            
    else:
        form = DamSelectionForm()


    context = {'dams': dams, 'form': form}
    return render(request, 'download-data.html', context)

#Creating a user registration form
def registerPage(request):
    if request.user.is_authenticated:
        return redirect('home')
    else:
        form = CustomUserCreationForm()

        if request.method == 'POST':
            form = CustomUserCreationForm(request.POST)
            if form.is_valid():
                form.save()
                #creating a flash message
                user = form.cleaned_data.get('username')
                messages.success(request, 'Account successfully created for ' + user + '. Please login')

                return redirect('login')

        context = {'form':form}
        return render(request, 'register.html', context)

#Function for logging in
def loginPage(request):
    if request.user.is_authenticated:
        return redirect('home')
    else:
        if request.method == 'POST':
            username = request.POST.get('username')
            password = request.POST.get('password')

            user = authenticate(request, username=username, password=password)

            if user is not None:
                login(request, user)
                return redirect('home')
            else:
                messages.info(request, 'Username Or Password is incorrect. Please try again')

        context = {}
        return render(request, 'login.html', context)

#Function for logging out
def logoutUser(request):
    logout(request)
    return redirect('login')

#FUNCTIONS FOR PROCESSING DATA AND LOADING PPREDICTION MODEL
#Loading the model
def load_model():
    #Loading the model architecture from the JSON file
    with open('pred_model.json','r') as json_file:
        loaded_model_json = json_file.read()
    loaded_model = model_from_json(loaded_model_json)

    #Loading the model weights
    loaded_model.load_weights("pred_model_weights.h5")

    #Compiling the model
    loaded_model.compile(loss='binary_crossentropy',optimizer='adam', metrics=['accuracy'])

    return loaded_model


from numpy import array
# split a multivariate sequence into samples
def split_sequences(sequences, n_steps_in, n_steps_out):
    X, y = list(), list()
    for i in range(len(sequences)):
        # find the end of this pattern
        end_ix = i + n_steps_in
        out_end_ix = end_ix + n_steps_out-1
        # check if we are beyond the dataset
        if out_end_ix >= len(sequences):
            break
        # gather input and output parts of the pattern
        seq_x, seq_y = sequences[i:end_ix, :-1], sequences[end_ix-1:out_end_ix, -1]
        X.append(seq_x)
        y.append(seq_y)
    return np.array(X), np.array(y)


#Preprocessing function to return numpy array sequences data.
def preprocess_data(data):
    # Extracting the relevant features (Note: We don't have dispatch and discharge. We shall be predicting water level )
    features = ['precipitation', 'humidity', 'temperature', 'waterlevel']
    df = pd.DataFrame(data.values_list(*features), columns=features)

    #separating variable
    df_input = df.iloc[:,:-1]
    df_target = df.iloc[:,-1]

    #converting the variables into numpy arrays
    df_input = df_input.to_numpy()
    df_target = df_target.to_numpy()

    #converting the output values into 2D format
    df_target = df_target[:,np.newaxis]

    #Normalising the input and output variables using the MinMaxScaler
    scaler = MinMaxScaler()
    df_input_scaled = scaler.fit_transform(df_input)
    df_target_scaled = scaler.fit_transform(df_target)

    #combining the input and output variables
    df_scaled = np.hstack((df_input_scaled,df_target_scaled))

    #choosing time step period
    n_steps_in, n_steps_out = 24, 5
    X, y = split_sequences(df_scaled, n_steps_in, n_steps_out)
   
    return X, y

#Function that makes the predictions
def make_predicitions_and_store(data, dam_id):
    #Selecting the dam
    dam = get_object_or_404(Dam, pk=dam_id)
    #Loading the model
    model = load_model()
    X,y = preprocess_data(data)
    #Making predictions
    predictions = model.predict(X)

    timestamps = pd.date_range(start=pd.to_datetime('now'), periods=len(predictions), freq='H')

    for i, prediction in enumerate(predictions):
        for value in prediction:
            Prediction.objects.create(
                dam=dam,
                timestamp=timestamps[i],
                waterlevel_prediction=round(value, 2)
            )



