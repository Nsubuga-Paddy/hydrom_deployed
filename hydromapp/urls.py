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
from django.urls import path, re_path
from django.conf import settings
from django.conf.urls.static import static
from . import views


urlpatterns = [
    path('admin/', admin.site.urls),

    # Legacy Django HTML UI (kept for reference / fallback)
    path('legacy/', views.legacy_home_view, name='legacy_home'),
    path('new-frontend/', views.new_frontend_view, name='new_frontend'),
    path('about-us.html/', views.about_us, name='about'),
    path('contact-us.html/', views.contact_us, name='contact'),
    path('download-data.html/', views.download_data_view, name='download'),
    path('notifications.html/', views.system_alarms, name='notifications'),
    path('help.html/', views.help, name='help'),
    path('hydrom/<int:dam_id>/realtime/', views.dam_realtime_view, name='dam_realtime_view'),
    path('hydrom/<int:dam_id>/gis/', views.dam_gis_view, name='dam_gis_view'),
    path('hydrom/<int:dam_id>/prediction/', views.dam_pred_view, name='dam_pred_view'),
    path('register.html/', views.registerPage, name='register'),
    path('login.html/', views.loginPage, name='login'),
    path('logout.html/', views.logoutUser, name='logout'),

    path('api/sensor_data/<int:dam_id>/', views.get_rt_sensor_data, name='get_rt_sensor_data'),
    path('api/dams/', views.api_dams_list, name='api_dams_list'),
    path('api/dams/<str:dam_id>/realtime/', views.api_dam_realtime, name='api_dam_realtime'),
    path(
        'api/dams/<str:dam_id>/realtime/history/',
        views.api_dam_realtime_history,
        name='api_dam_realtime_history',
    ),
    path('api/dams/<str:dam_id>/predictions/', views.api_dam_predictions, name='api_dam_predictions'),
    path(
        'api/dams/<str:dam_id>/predictions/run/',
        views.api_dam_predictions_run,
        name='api_dam_predictions_run',
    ),
    path('api/download-data/availability/', views.api_download_availability, name='api_download_availability'),
    path('api/download-data/export/', views.api_download_export, name='api_download_export'),
    path('api/feedback/', views.api_feedback_submit, name='api_feedback_submit'),
    path('api/auth/csrf/', views.api_auth_csrf, name='api_auth_csrf'),
    path('api/auth/csrf', views.api_auth_csrf),
    path('api/auth/me/', views.api_auth_me, name='api_auth_me'),
    path('api/auth/me', views.api_auth_me),
    path('api/auth/signup/', views.api_auth_signup, name='api_auth_signup'),
    path('api/auth/signup', views.api_auth_signup),
    path('api/auth/verify/', views.api_auth_verify, name='api_auth_verify'),
    path('api/auth/login/', views.api_auth_login, name='api_auth_login'),
    path('api/auth/login', views.api_auth_login),
    path('api/auth/logout/', views.api_auth_logout, name='api_auth_logout'),
    path('api/auth/logout', views.api_auth_logout),
    path('api/assistant/chat/', views.api_assistant_chat, name='api_assistant_chat'),
    path(
        'api/assistant/reports/<str:filename>/',
        views.api_assistant_report_download,
        name='api_assistant_report_download',
    ),
    path('api/system-reports/', views.api_system_reports_list, name='api_system_reports_list'),
    path(
        'api/system-reports/<int:report_id>/',
        views.api_system_report_detail,
        name='api_system_report_detail',
    ),
    path(
        'api/system-reports/<int:report_id>/pdf/',
        views.api_system_report_pdf,
        name='api_system_report_pdf',
    ),

    path('store-data/', views.store_data, name='store_data'),
    #path('store-data-http-proxy', views.store_data_http_proxy, name='store_data_http_proxy'),

    # React SPA: home + client-side routes (must be last)
    path('', views.spa_view, name='home'),
    re_path(r'^(?!api/|admin/|static/|media/|store-data/).*$', views.spa_view),
]

handler400 = 'hydromapp.auth_api.api_bad_request'
handler500 = 'hydromapp.auth_api.api_server_error'

# Add static/media serving during development (Whitenoise handles static in production)
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    # Prefer project static/ over STATIC_ROOT so Vite build assets are reachable before collectstatic
    urlpatterns += static(settings.STATIC_URL, document_root=settings.BASE_DIR / 'static')
