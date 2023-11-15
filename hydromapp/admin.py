from django.contrib import admin
from .models import Dam, Notification

class DamAdmin(admin.ModelAdmin):
    list_display = ('name', 'location', 'capacity', 'order')  # Display the order field in the admin list view
    list_editable = ('order',)  # Allow editing the order field directly in the list view
    ordering = ('order',)


class NotificationAdmin(admin.ModelAdmin):
    list_display = ('dam', 'priority', 'sensor_value')
    list_filter = ('priority', 'dam')
    search_fields = ('dam__name',)

    fieldsets = (
        (None, {'fields': ('dam', 'sensor_value','priority')}),
        ('Custome Messages',{'fields': ('custom_message_discharge', 'custom_message_below_active', 'custom_message_above_active')}),
    )

# Register the Dam model with the custom admin class
admin.site.register(Dam, DamAdmin)
admin.site.register(Notification)
