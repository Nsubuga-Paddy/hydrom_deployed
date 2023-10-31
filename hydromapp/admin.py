from django.contrib import admin
from .models import Dam, Notification

class DamAdmin(admin.ModelAdmin):
    list_display = ('name', 'location', 'capacity', 'order')  # Display the order field in the admin list view
    list_editable = ('order',)  # Allow editing the order field directly in the list view
    ordering = ('order',)

# Register the Dam model with the custom admin class
admin.site.register(Dam, DamAdmin)
admin.site.register(Notification)
