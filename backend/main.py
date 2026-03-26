"""FastAPI application for AI Video Pipeline."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
