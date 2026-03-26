# AI Video Pipeline

## Quick Start

```bash
# Install all deps
pip install -e ".[backend,dev]"

# Run backend
python run.py

# Run tests
pytest tests/ -v
```

## Architecture

- `pipeline/` — Existing Python video generation pipeline (do not modify unless necessary)
- `backend/` — FastAPI REST API + WebSocket wrapping the pipeline
- `frontend/` — React + Vite + Tailwind UI (planned)
- `tests/` — pytest tests for the backend

## Backend

- FastAPI app in `backend/main.py`
- SQLite database in `data/pipeline.db` (auto-created)
- Routers: `backend/routers/` (videos, scenarios, publishing, settings)
- WebSocket: `backend/ws.py` (real-time progress at `/ws/pipeline/{job_id}`)
- Services: `backend/services/` (video generation, scenario generation)

## Testing

```bash
pytest tests/ -v                    # All tests
pytest tests/test_videos_api.py -v  # Specific test file
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
