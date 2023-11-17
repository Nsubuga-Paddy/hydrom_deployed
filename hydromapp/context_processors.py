from .models import Dam, Notification

def notification_processor(request):
    notifications = Notification.objects.all()  # Modify the query as needed
    return {'global_notifications': notifications}

def dams_processor(request):
    dams = Dam.objects.order_by('order')
    return{'global_dams':dams}
