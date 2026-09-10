# AgriTwin AI

Farmer → Farm location → Satellite + weather + soil/crop data → AI analysis → Recommendations → Dashboard

> **New:** Weather Intelligence, AI Crop Disease Detection, Medicine Assistant, Farm Service Hub,
> Marketplace + Buyer/Offers/Inbox, and an AI Selling Advisor have been added on top of the phases
> below, with a new sidebar/topbar UI across every screen. See **[NEW_FEATURES.md](./NEW_FEATURES.md)**
> for what's real vs. disclosed-estimate, and setup steps.

This repo is being built in phases, per the plan:

- [x] **Phase 1 — Basic application**: React frontend, FastAPI backend, PostgreSQL/PostGIS. Farmer registration, farm boundary drawing on a map, farm list.
- [x] **Phase 2 — Satellite**: Google Earth Engine (service account auth) + Sentinel-2, cloud filtering/masking, NDVI mean/min/max, stress-decline detection vs. the previous stored observation.
- [x] **Phase 3 — Visualization**: NDVI trend chart (Recharts), per-zone field-health grid computed over the farm polygon, colored NDVI overlay on the Leaflet map.
- [x] **Phase 4 — Weather**: Open-Meteo integration (no API key needed) for current conditions plus 7d/30d rainfall and temperature summaries; a combined NDVI+weather "possible causes" insight endpoint.
- [x] **Phase 5 — ML**: Random Forest crop-health classifier (healthy/moderate/stressed), trained on a **synthetic placeholder dataset** — swap in real field data when you have it.
- [x] **Phase 6 — Recommendations**: rule engine combining the ML health score, the NDVI+weather possible-causes, crop, and growth stage into concrete, ground-truth-first actions.
- [x] **Phase 7 — AI assistant**: multilingual (English/Hindi/Marathi) Q&A via the Anthropic API, grounded in this farm's actual stored NDVI/weather/health/recommendation data rather than a generic chatbot.
- [x] **Phase 8 — Deployment**: Dockerfile + Procfile (gunicorn/uvicorn) for the backend, a Render blueprint (`render.yaml`) wiring backend + managed Postgres/PostGIS together, and `vercel.json` for the frontend. *(this commit)*

Every endpoint from the original module plan is now real — `/satellite`, `/ndvi`, `/ndvi/grid`, `/ndvi/history`, `/weather`, `/insight`, `/health`, `/recommendations`, `/ask`. Every phase from the original plan is built.

## Project layout

```
agritwin-ai/
├── frontend/          React (Vite) + Leaflet + Leaflet.draw
│   └── vercel.json     SPA rewrite config for Vercel
├── backend/           FastAPI + SQLAlchemy + GeoAlchemy2
│   ├── Dockerfile      For Docker-based deploys (Railway, Fly.io, etc.)
│   ├── Procfile        For buildpack-based deploys (Render, Railway)
│   └── app/
│       ├── main.py            entrypoint, CORS, router wiring
│       ├── database.py        SQLAlchemy engine/session
│       ├── schemas.py         Pydantic request/response models
│       ├── models/
│       │   ├── orm.py         SQLAlchemy ORM models
│       │   └── schema.sql     equivalent raw SQL (for reference/manual setup)
│       ├── routes/
│       │   ├── users.py       Module 1 - registration
│       │   ├── farms.py       Module 1+2 - farm + boundary
│       │   ├── satellite.py   Phase 2+3 - Sentinel-2, NDVI, stress detection, zone grid
│       │   ├── weather.py     Phase 4 - Open-Meteo weather + combined NDVI/weather insight
│       │   ├── health.py      Phase 5 - ML crop-health prediction
│       │   ├── recommendations.py  Phase 6 - rule engine turning predictions into actions
│       │   └── assistant.py   Phase 7 - multilingual AI Q&A grounded in farm data
│       └── services/
│           ├── geo.py          GeoJSON <-> WKT, acreage + centroid calculation
│           ├── earth_engine.py Service-account auth/init (file OR pasted-JSON key)
│           ├── sentinel.py     Sentinel-2 collection filtering + cloud masking
│           ├── ndvi.py         NDVI calculation, time series, zone grid, stress detection
│           ├── weather.py      Open-Meteo fetch + 7d/30d rainfall/temperature summaries
│           ├── prediction.py   Loads ml/model.pkl, scores a farm's current features
│           ├── recommendations.py  Health score + causes + crop/stage -> action list
│           └── assistant.py    Builds a farm-data snapshot + calls the Anthropic API
├── ml/
│   ├── generate_dataset.py    Builds a SYNTHETIC training dataset (see warning below)
│   ├── dataset.csv            Generated synthetic training data (2000 rows)
│   ├── train.py                Trains the Random Forest, saves model.pkl
│   └── model.pkl               Trained model bundle (model + feature columns + labels)
├── render.yaml         Render Blueprint: backend web service + managed Postgres/PostGIS
└── docker-compose.yml  local PostGIS database
```

## Setup — Phase 1

### 1. Database

```bash
docker compose up -d db
```

This starts PostGIS on `localhost:5432` (user `agritwin`, password `agritwin`, db `agritwin`). The backend creates tables automatically on startup (see `schema.sql` if you'd rather run it by hand).

### 2. Google Earth Engine service account (needed for Phase 2)

1. Create/select a Google Cloud project and [enable the Earth Engine API](https://console.cloud.google.com/apis/library/earthengine.googleapis.com) on it.
2. Create a service account in that project (IAM & Admin → Service Accounts), grant it the **Earth Engine Resource Viewer** role.
3. [Register the service account for Earth Engine access](https://developers.google.com/earth-engine/guides/service_account) — this is a separate step from creating it in Cloud IAM.
4. Create a JSON key for the service account and download it, e.g. as `backend/gee-service-account.json` (already gitignored).

### 3. Anthropic API key (needed for Phase 7)

Get a key from [console.anthropic.com](https://console.anthropic.com) and set `ANTHROPIC_API_KEY` in `.env`. Double-check `ANTHROPIC_MODEL` against [the current model list](https://docs.claude.com/en/docs/about-claude/models) before deploying — model names change over time.

### 4. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # set DATABASE_URL, the GEE_* variables, and ANTHROPIC_API_KEY
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs
Health check: http://localhost:8000/api/health

### 5. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — register as a farmer, then register a farm and draw its boundary on the map using the polygon tool. On the dashboard, click **Check crop health** on a farm card, or click the farm name to open its detail page: an AI chat assistant, health prediction, recommendations, NDVI field-health map, weather, a combined possible-cause insight, and a 90-day NDVI trend chart.

## What's proven so far

```
Farmer registers → draws farm polygon on Leaflet map → boundary + acreage
saved to PostGIS → farm shows on dashboard → "Check crop health" pulls the
latest cloud-filtered Sentinel-2 scene → computes NDVI mean/min/max over
the farm polygon → compares it to the last stored observation → flags a
possible decline → stores the new observation. Farm detail page splits
the polygon into a health grid and overlays it on the map, shows current
weather + 7d/30d rainfall and temperature, a 90-day NDVI trend chart, a
combined rule-based insight, and a Random Forest prediction (healthy /
moderate / stressed) fed by the same NDVI + weather features.
```

Notes on the NDVI endpoints:
- `GET /api/farms/{id}/ndvi` looks back 30 days by default (`?lookback_days=`) for the most recent scene under 20% cloud cover, and returns `404` if none qualifies — common right after sowing or in a cloudy stretch.
- `GET /api/farms/{id}/ndvi/grid?grid_size=3` splits the farm polygon into an NxN grid (2-6), computes mean NDVI per cell, and labels each `good`/`medium`/`low`.
- `GET /api/farms/{id}/ndvi/history?days=90` returns the full time series for a date range, feeding the trend chart.
- NDVI is a vegetation-vigor indicator, not a diagnosis — the stress message and zone labels are deliberately phrased as indicators, not certainties.

Notes on the weather endpoints:
- `GET /api/farms/{id}/weather` uses the farm polygon's centroid, calls Open-Meteo (no API key), and returns current conditions plus 7d/30d rainfall and 7d average temperature/humidity. Each call also upserts today's reading into the `weather` table.
- `GET /api/farms/{id}/insight` needs at least one stored NDVI observation (call `/ndvi` or `/ndvi/grid` first) — it compares the latest two NDVI readings against current rainfall/temperature and returns a `possible_causes` list, never a certainty.

Notes on the ML health prediction (Phase 5):
- **`ml/dataset.csv` is synthetic** — generated by `ml/generate_dataset.py` from a hand-coded rule (low NDVI + drought + heat → stressed, plus noise), not real field observations. It exists so the whole pipeline (dataset → training → serving → UI) runs end-to-end and produces sensible-looking output. A model trained only on this will not generalize to real farms; it will reproduce the rule it was generated from. Replace `dataset.csv` with real labeled observations and rerun `train.py` as soon as you have them.
- To retrain: `cd ml && python3 generate_dataset.py --rows 2000 && python3 train.py`. This overwrites `model.pkl`; the backend loads it fresh on first request after a restart.
- `GET /api/farms/{id}/health` needs a stored NDVI observation (call `/ndvi` first) — it combines that with live weather, runs the Random Forest, and stores the result in `predictions`.
- Current synthetic-model test accuracy: ~89% (see `ml/model_metrics.json`) — expected to be high since the labels were rule-generated; treat it as a pipeline sanity check, not a real-world accuracy claim.

Notes on recommendations (Phase 6):
- `GET /api/farms/{id}/recommendations?language=en` needs a stored prediction (call `/health` first, which itself needs `/ndvi` first). It's a rule engine, not another model — combines the health label, the same possible-causes logic `/insight` uses, and crop growth stage into a short prioritized action list, each stored as a row (with `language`, ready for Phase 7 translation).
- Recommendations are phrased as things to verify on the ground ("check soil moisture", "inspect for pests") rather than instructions to act on blindly, per the plan's own caution against over-claiming from NDVI/ML alone.

Notes on the AI assistant (Phase 7):
- `POST /api/farms/{id}/ask {"question": "...", "language": "hi"}` — if `language` is omitted, it falls back to the farm owner's registered language (set at signup). Supported codes: `en`, `hi`, `mr`.
- The assistant is grounded, not a generic chatbot: it's given this specific farm's latest stored NDVI, live weather, latest stored ML prediction, and latest stored recommendations, and instructed to answer only from that data and to always flag NDVI-based causes as possibilities, not certainties.
- Needs `ANTHROPIC_API_KEY` in `.env`. I couldn't run a live end-to-end test of this integration myself (no key available in the environment I built it in) — test it with a real key before relying on it.

## Deployment (Phase 8)

### Option A: Render Blueprint (backend + database, one click)

1. Push this repo to GitHub/GitLab.
2. In Render, **New → Blueprint**, point it at the repo — it reads `render.yaml` at the root and creates the `agritwin-db` Postgres instance and `agritwin-backend` web service together.
3. Render will prompt for the `sync: false` env vars during setup: `CORS_ORIGINS` (fill in after the frontend is deployed), `GEE_SERVICE_ACCOUNT`, `GEE_PRIVATE_KEY_JSON` (paste the full contents of the downloaded key file — no file upload needed), `GEE_PROJECT`, `ANTHROPIC_API_KEY`.
4. After the database is up, enable PostGIS on it once: connect with `psql` (Render gives you the connection string) and run `CREATE EXTENSION IF NOT EXISTS postgis;` — the app's own DB role may not have permission to do this itself, so it's not automatic.
5. The backend runs via `Procfile` (`gunicorn` with `uvicorn` workers) — same command Render's blueprint uses, so local `Procfile`-based tools (e.g. `honcho`) can also run it.

### Option B: Docker (Railway, Fly.io, or any container host)

```bash
cd backend
docker build -t agritwin-backend .
docker run -p 8000:8000 --env-file .env agritwin-backend
```

The `Dockerfile` installs system packages needed by `geoalchemy2`/`shapely`, then runs the same gunicorn/uvicorn command as the Procfile.

### Frontend: Vercel

1. Import the repo in Vercel, set the project's root directory to `frontend/`.
2. `vercel.json` is already set up with the SPA rewrite (`/* → /index.html`) that client-side routes like `/farms/:id` need — without it, refreshing on a farm's detail page would 404.
3. Set `VITE_API_BASE` in Vercel's environment variables to your deployed backend's URL (see `frontend/.env.example`).
4. Once deployed, go back to the backend's `CORS_ORIGINS` env var and set it to the Vercel URL.

### What I could and couldn't verify

- The full `requirements.txt` installs cleanly in a fresh virtualenv and the app imports correctly from it (tested directly) — the Dockerfile's dependency layer should behave the same way.
- The `render.yaml` field names (`rootDir`, `fromDatabase`/`connectionString`, `sync: false`) are checked against Render's current Blueprint docs, not written from memory.
- I could not build the Docker image or run an actual Render/Vercel deploy from this environment (no Docker daemon, no deploy credentials here) — the shapes are correct as written, but a real deploy is the only way to catch platform-specific surprises (build timeouts, GDAL system-package quirks on a given base image, etc.). Try Option A or B and let me know what breaks, if anything.

At this point every phase from the original plan is built, end to end. Let me know if you'd like help with the actual deploy, or if you want to swap the Phase 5 synthetic dataset for real field data now that the full pipeline is proven.
