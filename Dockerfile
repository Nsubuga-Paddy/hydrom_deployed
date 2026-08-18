# Hydro-M: Vite frontend + Django API in one image (Railway-friendly).

# ---- Frontend build ----
FROM node:20-bookworm AS frontend
WORKDIR /app/web

COPY web/package.json web/package-lock.json ./
RUN npm ci

COPY web/ ./
RUN npm run build

# ---- Django runtime ----
FROM python:3.10-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8000

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY . .

# Vite emits to static/frontend/ (see web/vite.config.ts)
COPY --from=frontend /app/static/frontend /app/static/frontend

# collectstatic needs Django settings; use throwaway values at build time only.
ENV SECRET_KEY=build-time-collectstatic-only \
    DEBUG=False \
    ALLOWED_HOSTS=* \
    CSRF_TRUSTED_ORIGINS=http://localhost \
    DATABASE_URL=

RUN python manage.py collectstatic --noinput

COPY bin/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 8000
ENTRYPOINT ["/docker-entrypoint.sh"]
