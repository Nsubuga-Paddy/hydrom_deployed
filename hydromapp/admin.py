from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from .models import Dam, Notification, UserProfile

class DamAdmin(admin.ModelAdmin):
    list_display = ('name', 'location', 'capacity', 'order')  # Display the order field in the admin list view
    list_editable = ('order',)  # Allow editing the order field directly in the list view
    ordering = ('order',)

class UserProfileInLine(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'UserProfile'
    fk_name = 'user'

class UserAdmin(BaseUserAdmin):
    inlines = (UserProfileInLine, )
    list_display = ("username", "email","get_phone_number", "get_dam", "is_staff")

    def get_phone_number(self, obj):
        return obj.userprofile.phone_number
    get_phone_number.short_description = 'Phone Number'

    def get_dam(self, obj):
        return obj.userprofile.dam.name if obj.userprofile.dam else None
    get_dam.short_description = 'Dam'

    def get_inline_instances(self, request, obj=None):
        if not obj:
            return list()
        return super(UserAdmin, self).get_inline_instances(request, obj)

# Register the Dam and UserRegistration model with the custom admin class
admin.site.register(Dam, DamAdmin)
admin.site.unregister(User)
admin.site.register(User, UserAdmin)

