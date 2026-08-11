from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from .models import Dam, Notification, UserProfile, DamPrecipitationState, FeedbackSubmission, SystemReport

class DamAdmin(admin.ModelAdmin):
    list_display = ('name', 'location', 'capacity', 'order')  # Display the order field in the admin list view
    list_editable = ('order',)  # Allow editing the order field directly in the list view
    ordering = ('order',)

class FeedbackSubmissionAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'name', 'area', 'priority', 'department', 'is_reviewed')
    list_filter = ('priority', 'area', 'is_reviewed', 'created_at')
    search_fields = ('name', 'email', 'department', 'area', 'message')
    list_editable = ('is_reviewed',)
    readonly_fields = ('created_at',)
    ordering = ('-created_at',)


class SystemReportAdmin(admin.ModelAdmin):
    list_display = (
        'title',
        'period_type',
        'period_start',
        'period_end',
        'status',
        'completeness_percent',
        'generated_at',
    )
    list_filter = ('period_type', 'status', 'narrative_provider')
    search_fields = ('title', 'summary')
    readonly_fields = ('created_at', 'updated_at', 'generated_at', 'summary_json')
    ordering = ('-period_end', '-id')

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
admin.site.register(DamPrecipitationState)
admin.site.register(FeedbackSubmission, FeedbackSubmissionAdmin)
admin.site.register(SystemReport, SystemReportAdmin)
admin.site.unregister(User)
admin.site.register(User, UserAdmin)

