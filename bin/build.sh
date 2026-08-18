#!/usr/bin/env bash
# Local helper: build React then collect Django static files.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Building Vite frontend"
cd web
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi
npm run build
cd "$ROOT"

echo "==> Collecting Django static files"
python manage.py collectstatic --noinput

echo "==> Frontend build ready at static/frontend/"
