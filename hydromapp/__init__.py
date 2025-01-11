from __future__ import absolute_import, unicode_literals

default_app_config = 'hydromapp.apps.HydromappConfig'

from .celery import app as celery_app

__all__ = ('celery_app',)
