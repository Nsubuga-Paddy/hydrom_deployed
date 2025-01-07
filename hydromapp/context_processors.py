from .models import Dam, Notification

def notification_processor(request):
    notifications = Notification.objects.all()  
    return {'global_notifications': notifications}

def dams_processor(request):
    dams = Dam.objects.order_by('order').prefetch_related('realtimesensordata_set', 'remotesensingdata_set')
    for dam in dams:
        # Fetching the latest RealTimeSensorData
        latest_realtime_data = dam.realtimesensordata_set.order_by('-timestamp').first()
        dam.latest_realtime_data = latest_realtime_data

        # Fetching the latest RemoteSensingData
        latest_remote_data = dam.remotesensingdata_set.order_by('-timestamp').first()
        dam.latest_remote_data = latest_remote_data

    return {'global_dams': dams}

