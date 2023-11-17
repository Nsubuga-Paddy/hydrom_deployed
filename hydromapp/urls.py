"""
URL configuration for hydromapp project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from . import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', views.home_view, name='home'),
    path('about-us.html/', views.about_us, name='about'),
    path('contact-us.html/', views.contact_us, name='contact'),
    path('download-data.html/', views.download_data_view, name='download'),
    path('notifications.html/', views.system_alarms, name='notifications'),
    path('help.html/', views.help, name='help'),
    path('hydrom/<int:dam_id>/realtime/', views.dam_realtime_view, name='dam_realtime_view'),
    path('hydrom/<int:dam_id>/gis/', views.dam_gis_view, name='dam_gis_view'),
    path('hydrom/<int:dam_id>/prediction/', views.dam_pred_view, name='dam_pred_view'),

    path('', views.sensor_data_display, name='sensor_data_display'),
    path('generate-random-sensor-data/', views.generate_random_sensor_data, name='generate_random_sensor_data'),
]
