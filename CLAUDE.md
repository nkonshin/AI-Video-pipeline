# AI Video Pipeline

## Quick Start

```bash
# Install backend deps
pip install -e ".[backend,dev]"

# Run backend (port 8000)
python run.py

# Run frontend (port 5173)
cd frontend && npm install && npm run dev

# Run backend tests
pytest tests/ -v
```

## Architecture

- `pipeline/` — Python video generation pipeline (image gen, video gen, TTS, assembly, publishing)
- `backend/` — FastAPI REST API + WebSocket wrapping the pipeline
- `frontend/` — React + Vite + Tailwind CSS + TanStack Query
- `tests/` — pytest tests for the backend (45 tests)

## Backend

- FastAPI app in `backend/main.py`
- SQLite database in `data/pipeline.db` (auto-created)
- Routers: `backend/routers/` (videos, scenarios, publishing, settings)
- WebSocket: `backend/ws.py` (real-time progress at `/ws/pipeline/{job_id}`)
- Services: `backend/services/` (video generation, scenario generation)
- Static media: `output/` served at `/media/`

## Frontend

- React 18 + TypeScript + Vite
- Tailwind CSS v4 — Dark Premium theme (indigo/violet, glassmorphism)
- TanStack Query for server state, Zustand for UI state
- React Router with 7 pages:
  - `/` — Dashboard (stats, active jobs, recent videos)
  - `/create` — Create Video (type selector, scene editor, model settings, cost estimate)
  - `/videos` — My Videos (grid with filters)
  - `/videos/:id` — Video Detail (player, metadata, publish)
  - `/scenarios` — Scenarios (CRUD, template generation)
  - `/publishing` — Publishing (platform management, log)
  - `/settings` — Settings (API keys, models, budget)
- API client: `frontend/src/lib/api.ts`
- Vite proxy: `/api` and `/ws` → `localhost:8000`

## Testing

```bash
pytest tests/ -v                    # All 45 tests
pytest tests/test_videos_api.py -v  # Specific file
```

Tests use in-memory SQLite — no setup needed.

## API

- `GET /api/health` — Health check
- `GET/POST /api/videos` — Video CRUD
- `POST /api/videos/:id/generate` — Start generation
- `POST /api/videos/:id/publish` — Publish to platforms
- `GET/POST /api/scenarios` — Scenario CRUD
- `POST /api/scenarios/generate` — Auto-generate from template
- `GET/PUT /api/settings` — Settings
- `GET /api/publishing/platforms` — Platform configs
- `WS /ws/pipeline/{job_id}` — Real-time progress
