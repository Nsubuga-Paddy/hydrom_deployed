#!/bin/sh
set -eu

# Apply DB migrations on boot (safe for Railway single-web deploys).
python manage.py migrate --noinput

# Railway injects PORT; default locally to 8000.
exec gunicorn hydromapp.wsgi \
  --bind "0.0.0.0:${PORT:-8000}" \
  --log-file -
