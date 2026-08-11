# Hydro-M Web (React)

Modern frontend for the Hydro-M dam monitoring system.

## Stack

- React 19 + TypeScript
- Vite 6
- React Router
- Chart.js + react-chartjs-2
- Font Awesome (React)

## Run (local development)

**Option A — Django serves the built SPA (matches production)**

```bash
cd web
npm install
npm run build
cd ..
pip install -r requirements.txt
python manage.py runserver
```

Open http://127.0.0.1:8000

**Option B — Vite HMR + Django API**

```bash
# terminal 1
python manage.py runserver

# terminal 2
cd web
npm run dev
```

Open http://localhost:5173 (Vite proxies `/api` to Django).

## Production (Railway)

One service builds Vite then runs Gunicorn. See `nixpacks.toml` and `bin/build.sh`.

- Build: `cd web && npm ci && npm run build` → `static/frontend/`
- Django serves `/` and React Router paths via `spa_view`
- API stays at `/api/...`

## Migration status

| Feature | Status |
|---------|--------|
| Shared layout (navbar, sidebar, mobile nav) | Done |
| Dashboard | Done |
| Real-time / GIS / Predictions (per dam) | Done |
| Dam-first monitor (`/dams/:id/:view`) | Done |
| System Alarms | Placeholder |
| Download Data | Placeholder |
| About / Contact / Help | Placeholder |
| Chat widget | Not started |

Legacy HTML pages remain in the parent folder for reference until each feature is migrated.
