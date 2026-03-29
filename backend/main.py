"""FastAPI application for AI Video Pipeline."""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.database import init_db
from backend.routers.settings import router as settings_router
from backend.routers.scenarios import router as scenarios_router
from backend.routers.videos import router as videos_router
from backend.routers.publishing import router as publishing_router
from backend.ws import router as ws_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize and cleanup resources."""
    await init_db()
    yield


app = FastAPI(
    title="Video Pipeline API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(settings_router)
app.include_router(scenarios_router)
app.include_router(videos_router)
app.include_router(publishing_router)
app.include_router(ws_router)

_output_dir = Path(__file__).resolve().parent.parent / "output"
_output_dir.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=str(_output_dir)), name="media")


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}


# Serve frontend build in production (when frontend/dist exists)
_frontend_dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if _frontend_dist.is_dir():
    from fastapi.responses import FileResponse

    # Serve static assets (JS, CSS, etc.)
    app.mount("/assets", StaticFiles(directory=str(_frontend_dist / "assets")), name="frontend-assets")

    # Catch-all: serve index.html for client-side routing
    @app.get("/{path:path}")
    async def serve_spa(path: str):
        file_path = _frontend_dist / path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(_frontend_dist / "index.html")
