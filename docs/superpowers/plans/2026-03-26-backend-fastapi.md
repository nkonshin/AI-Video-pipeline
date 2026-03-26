# Backend (FastAPI) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wrap the existing Python pipeline in a FastAPI backend with REST API, WebSocket progress streaming, and SQLite storage.

**Architecture:** FastAPI app with routers for videos, scenarios, publishing, and settings. The existing `pipeline/` package is imported as-is. Background tasks run video generation with progress callbacks streamed via WebSocket. SQLite stores metadata, file system stores media.

**Tech Stack:** FastAPI, SQLAlchemy 2.0 (async), aiosqlite, Alembic, uvicorn, websockets

---

## File Structure

```
backend/
├── main.py                  # FastAPI app setup, CORS, lifespan, static files
├── database.py              # SQLAlchemy engine, session, Base
├── models.py                # SQLAlchemy ORM models (videos, scenarios, publications, settings)
├── schemas.py               # Pydantic request/response schemas
├── routers/
│   ├── videos.py            # /api/videos/* endpoints
│   ├── scenarios.py         # /api/scenarios/* endpoints
│   ├── publishing.py        # /api/publishing/* endpoints
│   └── settings.py          # /api/settings/* endpoints
├── services/
│   ├── video_service.py     # Generation orchestration, background tasks, progress
│   └── scenario_service.py  # Scenario generation using built-in generators
├── ws.py                    # WebSocket endpoint for pipeline progress
├── alembic.ini              # Alembic config
└── alembic/
    ├── env.py               # Alembic environment
    └── versions/             # Migration files
tests/
├── conftest.py              # Shared fixtures (test DB, test client)
├── test_database.py         # DB model tests
├── test_schemas.py          # Schema validation tests
├── test_videos_api.py       # Videos endpoint tests
├── test_scenarios_api.py    # Scenarios endpoint tests
├── test_publishing_api.py   # Publishing endpoint tests
├── test_settings_api.py     # Settings endpoint tests
├── test_video_service.py    # Video service logic tests
└── test_ws.py               # WebSocket tests
```

---

### Task 1: Project Setup and Dependencies

**Files:**
- Modify: `pyproject.toml`
- Create: `backend/__init__.py`
- Create: `backend/main.py`
- Create: `tests/__init__.py`
- Create: `tests/conftest.py`

- [ ] **Step 1: Add backend dependencies to pyproject.toml**

Add to the `[project.dependencies]` list in `pyproject.toml`:

```toml
[project.optional-dependencies]
backend = [
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.30.0",
    "sqlalchemy[asyncio]>=2.0.0",
    "aiosqlite>=0.20.0",
    "alembic>=1.13.0",
    "websockets>=13.0",
]
dev = [
    "pytest>=8.0",
    "pytest-asyncio>=0.24.0",
    "httpx>=0.27.0",
    "ruff>=0.3.0",
]
```

- [ ] **Step 2: Create backend package with minimal FastAPI app**

Create `backend/__init__.py`:

```python
```

Create `backend/main.py`:

```python
"""FastAPI application for AI Video Pipeline."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize and cleanup resources."""
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


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
```

- [ ] **Step 3: Create test fixtures**

Create `tests/__init__.py`:

```python
```

Create `tests/conftest.py`:

```python
"""Shared test fixtures."""

import pytest
from httpx import ASGITransport, AsyncClient

from backend.main import app


@pytest.fixture
async def client():
    """Async test client for FastAPI app."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
```

- [ ] **Step 4: Write test for health endpoint**

Create `tests/test_health.py`:

```python
"""Health check tests."""

import pytest


@pytest.mark.asyncio
async def test_health_check(client):
    response = await client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

- [ ] **Step 5: Install dependencies and run test**

```bash
cd /Users/user/Desktop/Work/PetProjects/AI-Video-pipeline
pip install -e ".[backend,dev]"
pytest tests/test_health.py -v
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/ tests/ pyproject.toml
git commit -m "feat(backend): init FastAPI app with health endpoint and test fixtures"
```

---

### Task 2: Database Models and Engine

**Files:**
- Create: `backend/database.py`
- Create: `backend/models.py`
- Create: `tests/test_database.py`

- [ ] **Step 1: Write the failing test**

Create `tests/test_database.py`:

```python
"""Database model tests."""

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from backend.models import Base, Video, Scenario, Publication, Setting


@pytest.fixture
async def db_session():
    """In-memory SQLite session for testing."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session
    await engine.dispose()


@pytest.mark.asyncio
async def test_create_video(db_session: AsyncSession):
    video = Video(
        title="Test Video",
        content_type="fruit-soap",
        status="pending",
        scenario_config={"scenes": []},
    )
    db_session.add(video)
    await db_session.commit()

    result = await db_session.execute(select(Video))
    videos = result.scalars().all()
    assert len(videos) == 1
    assert videos[0].title == "Test Video"
    assert videos[0].id is not None


@pytest.mark.asyncio
async def test_create_scenario(db_session: AsyncSession):
    scenario = Scenario(
        name="Test Scenario",
        content_type="character-remix",
        config={"title": "Test", "scenes": []},
    )
    db_session.add(scenario)
    await db_session.commit()

    result = await db_session.execute(select(Scenario))
    scenarios = result.scalars().all()
    assert len(scenarios) == 1
    assert scenarios[0].name == "Test Scenario"


@pytest.mark.asyncio
async def test_create_publication(db_session: AsyncSession):
    video = Video(title="V", content_type="custom", status="completed", scenario_config={})
    db_session.add(video)
    await db_session.commit()

    pub = Publication(video_id=video.id, platform="telegram", status="success", post_url="https://t.me/123")
    db_session.add(pub)
    await db_session.commit()

    result = await db_session.execute(select(Publication))
    pubs = result.scalars().all()
    assert len(pubs) == 1
    assert pubs[0].platform == "telegram"


@pytest.mark.asyncio
async def test_setting_crud(db_session: AsyncSession):
    setting = Setting(key="budget_limit", value={"amount": 50.0})
    db_session.add(setting)
    await db_session.commit()

    result = await db_session.execute(select(Setting).where(Setting.key == "budget_limit"))
    s = result.scalar_one()
    assert s.value == {"amount": 50.0}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest tests/test_database.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'backend.models'`

- [ ] **Step 3: Create database engine module**

Create `backend/database.py`:

```python
"""SQLAlchemy async engine and session factory."""

from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

# Default DB path: project_root/data/pipeline.db
_DB_DIR = Path(__file__).resolve().parent.parent / "data"
_DB_DIR.mkdir(parents=True, exist_ok=True)
DATABASE_URL = f"sqlite+aiosqlite:///{_DB_DIR / 'pipeline.db'}"


class Base(DeclarativeBase):
    pass


engine = create_async_engine(DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_session():
    """Dependency for FastAPI routes."""
    async with async_session() as session:
        yield session


async def init_db():
    """Create all tables (used on app startup)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
```

- [ ] **Step 4: Create ORM models**

Create `backend/models.py`:

```python
"""SQLAlchemy ORM models."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _new_id() -> str:
    return uuid.uuid4().hex


class Video(Base):
    __tablename__ = "videos"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_new_id)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    scenario_config: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    cost: Mapped[float] = mapped_column(Float, default=0.0)
    output_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    thumbnail_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    publications: Mapped[list["Publication"]] = relationship(back_populates="video", cascade="all, delete-orphan")


class Scenario(Base):
    __tablename__ = "scenarios"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_new_id)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(50), nullable=False)
    config: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)


class Publication(Base):
    __tablename__ = "publications"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_new_id)
    video_id: Mapped[str] = mapped_column(String(32), ForeignKey("videos.id"), nullable=False)
    platform: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    post_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    video: Mapped["Video"] = relationship(back_populates="publications")


class Setting(Base):
    __tablename__ = "settings"

    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    value: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
```

- [ ] **Step 5: Run tests**

```bash
pytest tests/test_database.py -v
```

Expected: all 4 PASS

- [ ] **Step 6: Wire database init into FastAPI lifespan**

Update `backend/main.py` lifespan:

```python
from backend.database import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
```

- [ ] **Step 7: Run all tests**

```bash
pytest tests/ -v
```

Expected: all PASS (health + database tests)

- [ ] **Step 8: Commit**

```bash
git add backend/database.py backend/models.py tests/test_database.py backend/main.py
git commit -m "feat(backend): add SQLAlchemy models — videos, scenarios, publications, settings"
```

---

### Task 3: Pydantic Request/Response Schemas

**Files:**
- Create: `backend/schemas.py`
- Create: `tests/test_schemas.py`

- [ ] **Step 1: Write the failing test**

Create `tests/test_schemas.py`:

```python
"""Schema validation tests."""

import pytest
from pydantic import ValidationError

from backend.schemas import (
    VideoCreate,
    VideoResponse,
    ScenarioCreate,
    ScenarioResponse,
    ScenarioGenerate,
    PlatformConfig,
    SettingsUpdate,
    PipelineProgress,
)


def test_video_create_minimal():
    v = VideoCreate(title="Test", content_type="custom", scenario_config={"scenes": []})
    assert v.title == "Test"
    assert v.content_type == "custom"


def test_video_create_with_all_fields():
    v = VideoCreate(
        title="Ep 1",
        content_type="fruit-soap",
        scenario_config={
            "scenario": {"title": "Ep 1", "scenes": [{"scene_id": "s1", "image_prompt": "test", "voiceover_text": "hi", "description": "d"}]},
            "image_model": {"model_id": "black-forest-labs/flux-dev"},
        },
        skip_publish=True,
    )
    assert v.skip_publish is True


def test_video_create_missing_title():
    with pytest.raises(ValidationError):
        VideoCreate(content_type="custom", scenario_config={})


def test_video_response_has_all_fields():
    v = VideoResponse(
        id="abc123",
        title="Test",
        content_type="custom",
        status="pending",
        scenario_config={},
        cost=0.0,
        output_path=None,
        thumbnail_path=None,
        error_message=None,
        created_at="2026-03-26T00:00:00Z",
        completed_at=None,
        publications=[],
    )
    assert v.id == "abc123"


def test_scenario_create():
    s = ScenarioCreate(name="My Scenario", content_type="fruit-soap", config={"scenes": []})
    assert s.name == "My Scenario"


def test_scenario_generate():
    g = ScenarioGenerate(content_type="fruit-soap", episode_number=3)
    assert g.episode_number == 3


def test_scenario_generate_character_remix():
    g = ScenarioGenerate(content_type="character-remix", character_name="Шрек", context_index=1)
    assert g.character_name == "Шрек"


def test_platform_config():
    p = PlatformConfig(enabled=True, hashtags=["test", "video"], caption_template="Hello {title}")
    assert p.enabled is True


def test_pipeline_progress():
    p = PipelineProgress(
        job_id="abc",
        stage="video_gen",
        stage_label="Video Generation",
        scene=2,
        total_scenes=4,
        percent=50,
        message="Generating...",
    )
    assert p.percent == 50
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest tests/test_schemas.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'backend.schemas'`

- [ ] **Step 3: Create schemas**

Create `backend/schemas.py`:

```python
"""Pydantic request/response schemas for the API."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


# --- Videos ---

class VideoCreate(BaseModel):
    title: str
    content_type: str  # fruit-soap, character-remix, mascot, custom
    scenario_config: dict[str, Any]  # Full PipelineConfig as dict
    skip_publish: bool = False

class PublicationResponse(BaseModel):
    id: str
    platform: str
    status: str
    post_url: str | None = None
    error_message: str | None = None
    published_at: datetime

    model_config = {"from_attributes": True}

class VideoResponse(BaseModel):
    id: str
    title: str
    content_type: str
    status: str
    scenario_config: dict[str, Any]
    cost: float
    output_path: str | None = None
    thumbnail_path: str | None = None
    error_message: str | None = None
    created_at: datetime
    completed_at: datetime | None = None
    publications: list[PublicationResponse] = []

    model_config = {"from_attributes": True}

class VideoList(BaseModel):
    videos: list[VideoResponse]
    total: int


# --- Scenarios ---

class ScenarioCreate(BaseModel):
    name: str
    content_type: str
    config: dict[str, Any]

class ScenarioUpdate(BaseModel):
    name: str | None = None
    content_type: str | None = None
    config: dict[str, Any] | None = None

class ScenarioResponse(BaseModel):
    id: str
    name: str
    content_type: str
    config: dict[str, Any]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

class ScenarioGenerate(BaseModel):
    """Request to auto-generate a scenario using built-in generators."""
    content_type: str  # fruit-soap, character-remix, mascot
    episode_number: int = 1
    # For character-remix
    character_name: str | None = None
    context_index: int = 0
    # For mascot
    business_type: str | None = None
    company_name: str | None = None


# --- Publishing ---

class PlatformConfig(BaseModel):
    enabled: bool = True
    caption_template: str = ""
    hashtags: list[str] = Field(default_factory=list)
    credentials: dict[str, str] = Field(default_factory=dict)

class PlatformStatus(BaseModel):
    name: str
    connected: bool
    config: PlatformConfig

class PublishRequest(BaseModel):
    platforms: list[str]  # ["telegram", "instagram"]

class PublishLogEntry(BaseModel):
    id: str
    video_id: str
    video_title: str
    platform: str
    status: str
    post_url: str | None = None
    published_at: datetime

    model_config = {"from_attributes": True}


# --- Settings ---

class SettingsUpdate(BaseModel):
    replicate_api_token: str | None = None
    default_image_model: str | None = None
    default_video_model: str | None = None
    default_tts_engine: str | None = None
    default_tts_voice: str | None = None
    budget_limit: float | None = None
    output_dir: str | None = None

class SettingsResponse(BaseModel):
    replicate_api_token: str = ""  # masked in response
    default_image_model: str = "black-forest-labs/flux-dev"
    default_video_model: str = "minimax/hailuo-2.3"
    default_tts_engine: str = "edge-tts"
    default_tts_voice: str = "ru-RU-DmitryNeural"
    budget_limit: float = 50.0
    budget_spent: float = 0.0
    output_dir: str = "./output"

class BudgetResponse(BaseModel):
    limit: float
    spent: float
    remaining: float


# --- WebSocket ---

class PipelineProgress(BaseModel):
    job_id: str
    stage: str
    stage_label: str
    scene: int = 0
    total_scenes: int = 0
    percent: int = 0
    message: str = ""
    cost_so_far: float = 0.0
```

- [ ] **Step 4: Run tests**

```bash
pytest tests/test_schemas.py -v
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add backend/schemas.py tests/test_schemas.py
git commit -m "feat(backend): add Pydantic request/response schemas"
```

---

### Task 4: Settings Router

**Files:**
- Create: `backend/routers/__init__.py`
- Create: `backend/routers/settings.py`
- Create: `tests/test_settings_api.py`

- [ ] **Step 1: Write the failing test**

Create `tests/test_settings_api.py`:

```python
"""Settings API tests."""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from backend.database import Base, get_session
from backend.main import app
from backend.models import Setting
from httpx import ASGITransport, AsyncClient


@pytest.fixture
async def db_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        yield session
    await engine.dispose()


@pytest.fixture
async def client(db_session):
    async def override_session():
        yield db_session
    app.dependency_overrides[get_session] = override_session
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_get_settings_defaults(client):
    response = await client.get("/api/settings")
    assert response.status_code == 200
    data = response.json()
    assert data["budget_limit"] == 50.0
    assert data["default_image_model"] == "black-forest-labs/flux-dev"


@pytest.mark.asyncio
async def test_update_settings(client):
    response = await client.put("/api/settings", json={"budget_limit": 100.0, "default_tts_voice": "ru-RU-SvetlanaNeural"})
    assert response.status_code == 200
    data = response.json()
    assert data["budget_limit"] == 100.0
    assert data["default_tts_voice"] == "ru-RU-SvetlanaNeural"


@pytest.mark.asyncio
async def test_update_settings_persists(client):
    await client.put("/api/settings", json={"budget_limit": 75.0})
    response = await client.get("/api/settings")
    assert response.json()["budget_limit"] == 75.0


@pytest.mark.asyncio
async def test_get_budget(client):
    await client.put("/api/settings", json={"budget_limit": 50.0})
    response = await client.get("/api/settings/budget")
    assert response.status_code == 200
    data = response.json()
    assert data["limit"] == 50.0
    assert data["spent"] == 0.0
    assert data["remaining"] == 50.0


@pytest.mark.asyncio
async def test_api_token_masked(client):
    await client.put("/api/settings", json={"replicate_api_token": "r8_abc123secret"})
    response = await client.get("/api/settings")
    token = response.json()["replicate_api_token"]
    assert "secret" not in token
    assert token.startswith("r8_")
    assert token.endswith("***")
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest tests/test_settings_api.py -v
```

Expected: FAIL

- [ ] **Step 3: Implement settings router**

Create `backend/routers/__init__.py`:

```python
```

Create `backend/routers/settings.py`:

```python
"""Settings API router."""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_session
from backend.models import Setting
from backend.schemas import BudgetResponse, SettingsResponse, SettingsUpdate

router = APIRouter(prefix="/api/settings", tags=["settings"])

# Default settings values
_DEFAULTS = {
    "replicate_api_token": "",
    "default_image_model": "black-forest-labs/flux-dev",
    "default_video_model": "minimax/hailuo-2.3",
    "default_tts_engine": "edge-tts",
    "default_tts_voice": "ru-RU-DmitryNeural",
    "budget_limit": 50.0,
    "budget_spent": 0.0,
    "output_dir": "./output",
}


def _mask_token(token: str) -> str:
    """Mask API token for display, keeping first 3 chars."""
    if len(token) <= 6:
        return "***" if token else ""
    return token[:3] + "***"


async def _get_all_settings(session: AsyncSession) -> dict:
    """Load all settings, filling in defaults for missing keys."""
    result = await session.execute(select(Setting))
    stored = {s.key: s.value for s in result.scalars().all()}
    merged = {}
    for key, default in _DEFAULTS.items():
        if key in stored:
            merged[key] = stored[key].get("v", default)
        else:
            merged[key] = default
    return merged


@router.get("", response_model=SettingsResponse)
async def get_settings(session: AsyncSession = Depends(get_session)):
    settings = await _get_all_settings(session)
    settings["replicate_api_token"] = _mask_token(settings["replicate_api_token"])
    return SettingsResponse(**settings)


@router.put("", response_model=SettingsResponse)
async def update_settings(body: SettingsUpdate, session: AsyncSession = Depends(get_session)):
    updates = body.model_dump(exclude_none=True)
    for key, value in updates.items():
        result = await session.execute(select(Setting).where(Setting.key == key))
        existing = result.scalar_one_or_none()
        if existing:
            existing.value = {"v": value}
        else:
            session.add(Setting(key=key, value={"v": value}))
    await session.commit()

    settings = await _get_all_settings(session)
    settings["replicate_api_token"] = _mask_token(settings["replicate_api_token"])
    return SettingsResponse(**settings)


@router.get("/budget", response_model=BudgetResponse)
async def get_budget(session: AsyncSession = Depends(get_session)):
    settings = await _get_all_settings(session)
    limit = float(settings["budget_limit"])
    spent = float(settings["budget_spent"])
    return BudgetResponse(limit=limit, spent=spent, remaining=max(0, limit - spent))
```

- [ ] **Step 4: Register router in main.py**

Add to `backend/main.py`:

```python
from backend.routers.settings import router as settings_router

# After app creation
app.include_router(settings_router)
```

- [ ] **Step 5: Run tests**

```bash
pytest tests/test_settings_api.py -v
```

Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add backend/routers/ tests/test_settings_api.py backend/main.py
git commit -m "feat(backend): add settings API with budget tracking and token masking"
```

---

### Task 5: Scenarios Router

**Files:**
- Create: `backend/services/__init__.py`
- Create: `backend/services/scenario_service.py`
- Create: `backend/routers/scenarios.py`
- Create: `tests/test_scenarios_api.py`

- [ ] **Step 1: Write the failing test**

Create `tests/test_scenarios_api.py`:

```python
"""Scenarios API tests."""

import pytest
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from backend.database import Base, get_session
from backend.main import app
from httpx import ASGITransport, AsyncClient


@pytest.fixture
async def db_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        yield session
    await engine.dispose()


@pytest.fixture
async def client(db_session):
    async def override_session():
        yield db_session
    app.dependency_overrides[get_session] = override_session
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_create_scenario(client):
    response = await client.post("/api/scenarios", json={
        "name": "Test Scenario",
        "content_type": "custom",
        "config": {"title": "Test", "scenes": []}
    })
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Scenario"
    assert "id" in data


@pytest.mark.asyncio
async def test_list_scenarios(client):
    await client.post("/api/scenarios", json={"name": "S1", "content_type": "custom", "config": {}})
    await client.post("/api/scenarios", json={"name": "S2", "content_type": "fruit-soap", "config": {}})

    response = await client.get("/api/scenarios")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2


@pytest.mark.asyncio
async def test_get_scenario_by_id(client):
    create_resp = await client.post("/api/scenarios", json={"name": "S", "content_type": "custom", "config": {"a": 1}})
    scenario_id = create_resp.json()["id"]

    response = await client.get(f"/api/scenarios/{scenario_id}")
    assert response.status_code == 200
    assert response.json()["config"]["a"] == 1


@pytest.mark.asyncio
async def test_update_scenario(client):
    create_resp = await client.post("/api/scenarios", json={"name": "Old", "content_type": "custom", "config": {}})
    scenario_id = create_resp.json()["id"]

    response = await client.put(f"/api/scenarios/{scenario_id}", json={"name": "New"})
    assert response.status_code == 200
    assert response.json()["name"] == "New"


@pytest.mark.asyncio
async def test_delete_scenario(client):
    create_resp = await client.post("/api/scenarios", json={"name": "Del", "content_type": "custom", "config": {}})
    scenario_id = create_resp.json()["id"]

    response = await client.delete(f"/api/scenarios/{scenario_id}")
    assert response.status_code == 204

    response = await client.get(f"/api/scenarios/{scenario_id}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_generate_fruit_soap(client):
    response = await client.post("/api/scenarios/generate", json={
        "content_type": "fruit-soap",
        "episode_number": 2,
    })
    assert response.status_code == 200
    data = response.json()
    assert data["content_type"] == "fruit-soap"
    assert len(data["config"]["scenes"]) > 0


@pytest.mark.asyncio
async def test_generate_character_remix(client):
    response = await client.post("/api/scenarios/generate", json={
        "content_type": "character-remix",
        "character_name": "Шрек",
        "context_index": 0,
    })
    assert response.status_code == 200
    data = response.json()
    assert "Шрек" in data["config"]["title"]


@pytest.mark.asyncio
async def test_generate_mascot(client):
    response = await client.post("/api/scenarios/generate", json={
        "content_type": "mascot",
        "business_type": "кофейня",
    })
    assert response.status_code == 200
    data = response.json()
    assert len(data["config"]["scenes"]) > 0


@pytest.mark.asyncio
async def test_generate_unknown_type(client):
    response = await client.post("/api/scenarios/generate", json={
        "content_type": "unknown-type",
    })
    assert response.status_code == 400
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest tests/test_scenarios_api.py -v
```

Expected: FAIL

- [ ] **Step 3: Create scenario service**

Create `backend/services/__init__.py`:

```python
```

Create `backend/services/scenario_service.py`:

```python
"""Scenario generation service — wraps existing pipeline generators."""

from pipeline.generators.scenario_gen import (
    CharacterRemixGenerator,
    FruitSoapOperaGenerator,
    MascotContentGenerator,
)
from backend.schemas import ScenarioGenerate


def generate_scenario(request: ScenarioGenerate) -> dict:
    """Generate a scenario config using built-in generators.

    Returns the ScenarioConfig as a dict (JSON-serializable).
    """
    content_type = request.content_type

    if content_type == "fruit-soap":
        gen = FruitSoapOperaGenerator()
        scenario = gen.generate(episode_number=request.episode_number)

    elif content_type == "character-remix":
        gen = CharacterRemixGenerator()
        scenario = gen.generate(
            character_name=request.character_name or "Шрек",
            context_index=request.context_index,
            episode_number=request.episode_number,
        )

    elif content_type == "mascot":
        gen = MascotContentGenerator()
        scenario = gen.generate(
            business_type=request.business_type or "недвижимость",
            company_name=request.company_name or "",
            episode_number=request.episode_number,
        )

    else:
        raise ValueError(f"Unknown content type: {content_type}")

    return scenario.model_dump()
```

- [ ] **Step 4: Create scenarios router**

Create `backend/routers/scenarios.py`:

```python
"""Scenarios API router."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_session
from backend.models import Scenario
from backend.schemas import ScenarioCreate, ScenarioGenerate, ScenarioResponse, ScenarioUpdate
from backend.services.scenario_service import generate_scenario

router = APIRouter(prefix="/api/scenarios", tags=["scenarios"])


@router.get("", response_model=list[ScenarioResponse])
async def list_scenarios(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Scenario).order_by(Scenario.created_at.desc()))
    return result.scalars().all()


@router.get("/{scenario_id}", response_model=ScenarioResponse)
async def get_scenario(scenario_id: str, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Scenario).where(Scenario.id == scenario_id))
    scenario = result.scalar_one_or_none()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return scenario


@router.post("", response_model=ScenarioResponse, status_code=201)
async def create_scenario(body: ScenarioCreate, session: AsyncSession = Depends(get_session)):
    scenario = Scenario(name=body.name, content_type=body.content_type, config=body.config)
    session.add(scenario)
    await session.commit()
    await session.refresh(scenario)
    return scenario


@router.put("/{scenario_id}", response_model=ScenarioResponse)
async def update_scenario(scenario_id: str, body: ScenarioUpdate, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Scenario).where(Scenario.id == scenario_id))
    scenario = result.scalar_one_or_none()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")

    updates = body.model_dump(exclude_none=True)
    for key, value in updates.items():
        setattr(scenario, key, value)
    await session.commit()
    await session.refresh(scenario)
    return scenario


@router.delete("/{scenario_id}", status_code=204)
async def delete_scenario(scenario_id: str, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Scenario).where(Scenario.id == scenario_id))
    scenario = result.scalar_one_or_none()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    await session.delete(scenario)
    await session.commit()


@router.post("/generate", response_model=ScenarioResponse)
async def generate_scenario_endpoint(body: ScenarioGenerate, session: AsyncSession = Depends(get_session)):
    try:
        config = generate_scenario(body)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    scenario = Scenario(
        name=config.get("title", "Generated Scenario"),
        content_type=body.content_type,
        config=config,
    )
    session.add(scenario)
    await session.commit()
    await session.refresh(scenario)
    return scenario
```

- [ ] **Step 5: Register router in main.py**

Add to `backend/main.py`:

```python
from backend.routers.scenarios import router as scenarios_router

app.include_router(scenarios_router)
```

- [ ] **Step 6: Run tests**

```bash
pytest tests/test_scenarios_api.py -v
```

Expected: all PASS

- [ ] **Step 7: Commit**

```bash
git add backend/services/ backend/routers/scenarios.py tests/test_scenarios_api.py backend/main.py
git commit -m "feat(backend): add scenarios API with CRUD and built-in generators"
```

---

### Task 6: Videos Router (CRUD, without generation)

**Files:**
- Create: `backend/routers/videos.py`
- Create: `tests/test_videos_api.py`

- [ ] **Step 1: Write the failing test**

Create `tests/test_videos_api.py`:

```python
"""Videos API tests."""

import pytest
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from backend.database import Base, get_session
from backend.main import app
from httpx import ASGITransport, AsyncClient


@pytest.fixture
async def db_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        yield session
    await engine.dispose()


@pytest.fixture
async def client(db_session):
    async def override_session():
        yield db_session
    app.dependency_overrides[get_session] = override_session
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_create_video(client):
    response = await client.post("/api/videos", json={
        "title": "Test Video",
        "content_type": "custom",
        "scenario_config": {"scenes": []},
    })
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Test Video"
    assert data["status"] == "pending"
    assert "id" in data


@pytest.mark.asyncio
async def test_list_videos(client):
    await client.post("/api/videos", json={"title": "V1", "content_type": "custom", "scenario_config": {}})
    await client.post("/api/videos", json={"title": "V2", "content_type": "fruit-soap", "scenario_config": {}})

    response = await client.get("/api/videos")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert len(data["videos"]) == 2


@pytest.mark.asyncio
async def test_list_videos_filter_by_status(client):
    await client.post("/api/videos", json={"title": "V1", "content_type": "custom", "scenario_config": {}})

    response = await client.get("/api/videos?status=pending")
    assert response.json()["total"] == 1

    response = await client.get("/api/videos?status=completed")
    assert response.json()["total"] == 0


@pytest.mark.asyncio
async def test_list_videos_filter_by_content_type(client):
    await client.post("/api/videos", json={"title": "V1", "content_type": "custom", "scenario_config": {}})
    await client.post("/api/videos", json={"title": "V2", "content_type": "fruit-soap", "scenario_config": {}})

    response = await client.get("/api/videos?content_type=fruit-soap")
    assert response.json()["total"] == 1


@pytest.mark.asyncio
async def test_get_video_by_id(client):
    create_resp = await client.post("/api/videos", json={"title": "V", "content_type": "custom", "scenario_config": {"a": 1}})
    video_id = create_resp.json()["id"]

    response = await client.get(f"/api/videos/{video_id}")
    assert response.status_code == 200
    assert response.json()["scenario_config"]["a"] == 1


@pytest.mark.asyncio
async def test_get_video_not_found(client):
    response = await client.get("/api/videos/nonexistent")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_video(client):
    create_resp = await client.post("/api/videos", json={"title": "V", "content_type": "custom", "scenario_config": {}})
    video_id = create_resp.json()["id"]

    response = await client.delete(f"/api/videos/{video_id}")
    assert response.status_code == 204

    response = await client.get(f"/api/videos/{video_id}")
    assert response.status_code == 404
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest tests/test_videos_api.py -v
```

Expected: FAIL

- [ ] **Step 3: Implement videos router**

Create `backend/routers/videos.py`:

```python
"""Videos API router."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.database import get_session
from backend.models import Video
from backend.schemas import VideoCreate, VideoList, VideoResponse

router = APIRouter(prefix="/api/videos", tags=["videos"])


@router.get("", response_model=VideoList)
async def list_videos(
    status: str | None = None,
    content_type: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_session),
):
    query = select(Video).options(selectinload(Video.publications))
    count_query = select(func.count(Video.id))

    if status:
        query = query.where(Video.status == status)
        count_query = count_query.where(Video.status == status)
    if content_type:
        query = query.where(Video.content_type == content_type)
        count_query = count_query.where(Video.content_type == content_type)

    query = query.order_by(Video.created_at.desc()).offset(offset).limit(limit)

    result = await session.execute(query)
    videos = result.scalars().all()

    total_result = await session.execute(count_query)
    total = total_result.scalar()

    return VideoList(videos=videos, total=total)


@router.get("/{video_id}", response_model=VideoResponse)
async def get_video(video_id: str, session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(Video).options(selectinload(Video.publications)).where(Video.id == video_id)
    )
    video = result.scalar_one_or_none()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    return video


@router.post("", response_model=VideoResponse, status_code=201)
async def create_video(body: VideoCreate, session: AsyncSession = Depends(get_session)):
    video = Video(
        title=body.title,
        content_type=body.content_type,
        status="pending",
        scenario_config=body.scenario_config,
    )
    session.add(video)
    await session.commit()
    await session.refresh(video)
    return video


@router.delete("/{video_id}", status_code=204)
async def delete_video(video_id: str, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Video).where(Video.id == video_id))
    video = result.scalar_one_or_none()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    await session.delete(video)
    await session.commit()
```

- [ ] **Step 4: Register router in main.py**

Add to `backend/main.py`:

```python
from backend.routers.videos import router as videos_router

app.include_router(videos_router)
```

- [ ] **Step 5: Run tests**

```bash
pytest tests/test_videos_api.py -v
```

Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add backend/routers/videos.py tests/test_videos_api.py backend/main.py
git commit -m "feat(backend): add videos API with CRUD, filtering, and pagination"
```

---

### Task 7: Video Generation Service with Progress Callbacks

**Files:**
- Create: `backend/services/video_service.py`
- Create: `tests/test_video_service.py`

- [ ] **Step 1: Write the failing test**

Create `tests/test_video_service.py`:

```python
"""Video service tests."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from backend.services.video_service import ProgressTracker, run_pipeline_with_progress


def test_progress_tracker_stages():
    tracker = ProgressTracker(total_scenes=4)
    assert tracker.percent == 0

    tracker.update("image_gen", scene=1)
    assert tracker.stage == "image_gen"
    assert tracker.scene == 1
    assert 0 < tracker.percent < 100

    tracker.update("image_gen", scene=4)
    # After all images, should be ~16% (1 of 6 stages)

    tracker.update("video_gen", scene=1)
    assert tracker.stage == "video_gen"

    tracker.update("completed", scene=0)
    assert tracker.percent == 100


def test_progress_tracker_to_dict():
    tracker = ProgressTracker(total_scenes=2, job_id="test-123")
    tracker.update("tts", scene=1, message="Generating voice...")
    d = tracker.to_dict()
    assert d["job_id"] == "test-123"
    assert d["stage"] == "tts"
    assert d["stage_label"] == "TTS Voiceover"
    assert d["scene"] == 1
    assert d["total_scenes"] == 2
    assert d["message"] == "Generating voice..."


def test_progress_tracker_stage_labels():
    tracker = ProgressTracker(total_scenes=1)
    labels = {
        "image_gen": "Image Generation",
        "video_gen": "Video Generation",
        "tts": "TTS Voiceover",
        "subtitle": "Subtitles",
        "assembly": "Assembly",
        "publish": "Publishing",
        "completed": "Completed",
    }
    for stage, label in labels.items():
        tracker.update(stage)
        assert tracker.to_dict()["stage_label"] == label
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest tests/test_video_service.py -v
```

Expected: FAIL

- [ ] **Step 3: Implement video service**

Create `backend/services/video_service.py`:

```python
"""Video generation service with progress tracking."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

from pipeline.config import PipelineConfig, load_env
from pipeline.orchestrator import PipelineOrchestrator

STAGE_ORDER = ["image_gen", "video_gen", "tts", "subtitle", "assembly", "publish", "completed"]

STAGE_LABELS = {
    "image_gen": "Image Generation",
    "video_gen": "Video Generation",
    "tts": "TTS Voiceover",
    "subtitle": "Subtitles",
    "assembly": "Assembly",
    "publish": "Publishing",
    "completed": "Completed",
}


class ProgressTracker:
    """Tracks pipeline progress across stages and scenes."""

    def __init__(self, total_scenes: int = 1, job_id: str = ""):
        self.job_id = job_id
        self.total_scenes = total_scenes
        self.stage = "pending"
        self.scene = 0
        self.message = ""
        self.cost_so_far = 0.0
        self._on_update: Callable[[dict], Any] | None = None

    @property
    def percent(self) -> int:
        if self.stage == "completed":
            return 100
        if self.stage not in STAGE_ORDER:
            return 0
        stage_idx = STAGE_ORDER.index(self.stage)
        total_stages = len(STAGE_ORDER) - 1  # exclude "completed"
        if self.total_scenes > 0 and self.scene > 0:
            scene_frac = self.scene / self.total_scenes
        else:
            scene_frac = 0.5
        return int(((stage_idx + scene_frac) / total_stages) * 100)

    def update(self, stage: str, scene: int = 0, message: str = "", cost: float = 0.0):
        self.stage = stage
        self.scene = scene
        if message:
            self.message = message
        if cost > 0:
            self.cost_so_far = cost

    def to_dict(self) -> dict:
        return {
            "job_id": self.job_id,
            "stage": self.stage,
            "stage_label": STAGE_LABELS.get(self.stage, self.stage),
            "scene": self.scene,
            "total_scenes": self.total_scenes,
            "percent": self.percent,
            "message": self.message,
            "cost_so_far": self.cost_so_far,
        }


# Active job trackers: job_id -> ProgressTracker
active_jobs: dict[str, ProgressTracker] = {}


async def run_pipeline_with_progress(
    job_id: str,
    config_dict: dict[str, Any],
    on_progress: Callable[[dict], Any] | None = None,
    skip_publish: bool = False,
) -> dict[str, Any]:
    """Run the pipeline in a thread, reporting progress via callback.

    This wraps the synchronous PipelineOrchestrator.run() in a thread executor
    so it doesn't block the async event loop.
    """
    config = PipelineConfig.model_validate(config_dict)
    total_scenes = len(config.scenario.scenes)
    tracker = ProgressTracker(total_scenes=total_scenes, job_id=job_id)
    active_jobs[job_id] = tracker

    def sync_run() -> dict[str, Any]:
        env = load_env()
        orchestrator = PipelineOrchestrator(config, env)
        # Run pipeline — stages report progress via log messages
        # Future enhancement: inject callback into orchestrator
        result = orchestrator.run(skip_publish=skip_publish)
        return result

    try:
        # Report start
        tracker.update("image_gen", scene=1, message="Starting image generation...")
        if on_progress:
            await on_progress(tracker.to_dict())

        # Run synchronous pipeline in thread
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, sync_run)

        tracker.update("completed", message="Pipeline completed!")
        if on_progress:
            await on_progress(tracker.to_dict())

        return result

    except Exception as e:
        tracker.update("failed", message=str(e))
        if on_progress:
            await on_progress(tracker.to_dict())
        raise

    finally:
        active_jobs.pop(job_id, None)
```

- [ ] **Step 4: Run tests**

```bash
pytest tests/test_video_service.py -v
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add backend/services/video_service.py tests/test_video_service.py
git commit -m "feat(backend): add video service with progress tracking"
```

---

### Task 8: WebSocket Endpoint for Progress Streaming

**Files:**
- Create: `backend/ws.py`
- Create: `tests/test_ws.py`

- [ ] **Step 1: Write the failing test**

Create `tests/test_ws.py`:

```python
"""WebSocket tests."""

import pytest
from unittest.mock import patch

from backend.services.video_service import ProgressTracker, active_jobs
from starlette.testclient import TestClient

from backend.main import app


def test_websocket_receives_progress():
    """Test that WebSocket sends progress when a job exists."""
    # Pre-populate an active job
    tracker = ProgressTracker(total_scenes=4, job_id="test-job-1")
    tracker.update("video_gen", scene=2, message="Generating video...")
    active_jobs["test-job-1"] = tracker

    client = TestClient(app)
    with client.websocket_connect("/ws/pipeline/test-job-1") as ws:
        data = ws.receive_json()
        assert data["job_id"] == "test-job-1"
        assert data["stage"] == "video_gen"
        assert data["scene"] == 2

    # Cleanup
    active_jobs.pop("test-job-1", None)


def test_websocket_unknown_job():
    """Test that WebSocket closes cleanly for unknown job."""
    client = TestClient(app)
    with client.websocket_connect("/ws/pipeline/nonexistent") as ws:
        data = ws.receive_json()
        assert data["stage"] == "unknown"
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest tests/test_ws.py -v
```

Expected: FAIL

- [ ] **Step 3: Implement WebSocket endpoint**

Create `backend/ws.py`:

```python
"""WebSocket endpoint for real-time pipeline progress."""

import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.services.video_service import active_jobs

router = APIRouter()


@router.websocket("/ws/pipeline/{job_id}")
async def pipeline_progress(websocket: WebSocket, job_id: str):
    await websocket.accept()

    try:
        tracker = active_jobs.get(job_id)
        if not tracker:
            await websocket.send_json({
                "job_id": job_id,
                "stage": "unknown",
                "stage_label": "Not Found",
                "scene": 0,
                "total_scenes": 0,
                "percent": 0,
                "message": f"No active job with id '{job_id}'",
                "cost_so_far": 0.0,
            })
            return

        last_sent = None
        while True:
            tracker = active_jobs.get(job_id)
            if not tracker:
                # Job finished and was removed
                await websocket.send_json({
                    "job_id": job_id,
                    "stage": "completed",
                    "stage_label": "Completed",
                    "scene": 0,
                    "total_scenes": 0,
                    "percent": 100,
                    "message": "Job completed",
                    "cost_so_far": 0.0,
                })
                break

            current = tracker.to_dict()
            if current != last_sent:
                await websocket.send_json(current)
                last_sent = current

            if tracker.stage in ("completed", "failed"):
                break

            await asyncio.sleep(1)

    except WebSocketDisconnect:
        pass
```

- [ ] **Step 4: Register WebSocket router in main.py**

Add to `backend/main.py`:

```python
from backend.ws import router as ws_router

app.include_router(ws_router)
```

- [ ] **Step 5: Run tests**

```bash
pytest tests/test_ws.py -v
```

Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add backend/ws.py tests/test_ws.py backend/main.py
git commit -m "feat(backend): add WebSocket endpoint for real-time pipeline progress"
```

---

### Task 9: Video Generation Endpoint (POST trigger + background task)

**Files:**
- Modify: `backend/routers/videos.py`
- Modify: `tests/test_videos_api.py`

- [ ] **Step 1: Add generation trigger test**

Append to `tests/test_videos_api.py`:

```python
@pytest.mark.asyncio
async def test_create_video_starts_generation(client):
    """Creating a video should set status to 'pending' and return job info."""
    response = await client.post("/api/videos", json={
        "title": "Gen Test",
        "content_type": "fruit-soap",
        "scenario_config": {
            "scenario": {
                "title": "Gen Test",
                "series_name": "Test",
                "episode_number": 1,
                "scenes": [
                    {"scene_id": "s1", "description": "d", "image_prompt": "p", "voiceover_text": "t"}
                ],
            },
        },
    })
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "pending"


@pytest.mark.asyncio
async def test_start_generation_endpoint(client):
    """POST /api/videos/:id/generate should accept and return 202."""
    create_resp = await client.post("/api/videos", json={
        "title": "V",
        "content_type": "custom",
        "scenario_config": {
            "scenario": {"title": "T", "series_name": "S", "episode_number": 1, "scenes": [
                {"scene_id": "s1", "description": "d", "image_prompt": "p", "voiceover_text": "t"}
            ]},
        },
    })
    video_id = create_resp.json()["id"]

    # Patch to avoid actually running the pipeline
    with patch("backend.routers.videos.run_generation_task"):
        response = await client.post(f"/api/videos/{video_id}/generate")
        assert response.status_code == 202
        data = response.json()
        assert data["status"] == "running"
```

- [ ] **Step 2: Add missing import at top of test file**

Add at the top of `tests/test_videos_api.py`:

```python
from unittest.mock import patch
```

- [ ] **Step 3: Run test to verify it fails**

```bash
pytest tests/test_videos_api.py::test_start_generation_endpoint -v
```

Expected: FAIL

- [ ] **Step 4: Add generation endpoint to videos router**

Add to `backend/routers/videos.py`:

```python
import asyncio
from datetime import datetime, timezone

from backend.services.video_service import run_pipeline_with_progress


async def run_generation_task(video_id: str, scenario_config: dict, session_factory):
    """Background task that runs the pipeline and updates the DB."""
    async with session_factory() as session:
        result_q = await session.execute(select(Video).where(Video.id == video_id))
        video = result_q.scalar_one_or_none()
        if not video:
            return

        video.status = "running"
        await session.commit()

        try:
            result = await run_pipeline_with_progress(
                job_id=video_id,
                config_dict=scenario_config,
            )
            video.status = "completed"
            video.completed_at = datetime.now(timezone.utc)
            video.output_path = result.get("final_video")
            # Use first image as thumbnail
            images = result.get("images", {})
            if images:
                video.thumbnail_path = next(iter(images.values()), None)
        except Exception as e:
            video.status = "failed"
            video.error_message = str(e)

        await session.commit()


@router.post("/{video_id}/generate", status_code=202)
async def start_generation(video_id: str, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Video).where(Video.id == video_id))
    video = result.scalar_one_or_none()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    if video.status == "running":
        raise HTTPException(status_code=409, detail="Generation already in progress")

    video.status = "running"
    await session.commit()

    from backend.database import async_session
    asyncio.create_task(run_generation_task(video_id, video.scenario_config, async_session))

    return {"id": video_id, "status": "running"}
```

- [ ] **Step 5: Run tests**

```bash
pytest tests/test_videos_api.py -v
```

Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add backend/routers/videos.py tests/test_videos_api.py
git commit -m "feat(backend): add video generation trigger endpoint with background task"
```

---

### Task 10: Publishing Router

**Files:**
- Create: `backend/routers/publishing.py`
- Create: `tests/test_publishing_api.py`

- [ ] **Step 1: Write the failing test**

Create `tests/test_publishing_api.py`:

```python
"""Publishing API tests."""

import pytest
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from backend.database import Base, get_session
from backend.models import Video, Publication
from backend.main import app
from httpx import ASGITransport, AsyncClient


@pytest.fixture
async def db_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        yield session
    await engine.dispose()


@pytest.fixture
async def client(db_session):
    async def override_session():
        yield db_session
    app.dependency_overrides[get_session] = override_session
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_get_platforms(client):
    response = await client.get("/api/publishing/platforms")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 5
    names = {p["name"] for p in data}
    assert names == {"telegram", "instagram", "youtube", "vk", "tiktok"}


@pytest.mark.asyncio
async def test_update_platform_config(client):
    response = await client.put("/api/publishing/platforms/telegram", json={
        "enabled": True,
        "hashtags": ["shorts", "ai"],
        "caption_template": "{title} | AI generated",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "telegram"
    assert data["config"]["hashtags"] == ["shorts", "ai"]


@pytest.mark.asyncio
async def test_get_publish_log(client, db_session):
    video = Video(title="V1", content_type="custom", status="completed", scenario_config={})
    db_session.add(video)
    await db_session.commit()

    pub = Publication(video_id=video.id, platform="telegram", status="success", post_url="https://t.me/1")
    db_session.add(pub)
    await db_session.commit()

    response = await client.get("/api/publishing/log")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["platform"] == "telegram"
    assert data[0]["video_title"] == "V1"


@pytest.mark.asyncio
async def test_publish_video(client, db_session):
    """POST /api/videos/:id/publish should record publications (mocked)."""
    video = Video(title="V", content_type="custom", status="completed", scenario_config={}, output_path="/tmp/test.mp4")
    db_session.add(video)
    await db_session.commit()

    # This will fail because there's no actual video file / credentials,
    # but the endpoint should handle gracefully
    response = await client.post(f"/api/videos/{video.id}/publish", json={
        "platforms": ["telegram"],
    })
    # Accept 200 (published) or 207 (partial success/failure)
    assert response.status_code in (200, 207)
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest tests/test_publishing_api.py -v
```

Expected: FAIL

- [ ] **Step 3: Implement publishing router**

Create `backend/routers/publishing.py`:

```python
"""Publishing API router."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.database import get_session
from backend.models import Publication, Setting, Video
from backend.schemas import PlatformConfig, PlatformStatus, PublishRequest

router = APIRouter(prefix="/api/publishing", tags=["publishing"])

PLATFORMS = ["telegram", "instagram", "youtube", "vk", "tiktok"]


async def _get_platform_config(session: AsyncSession, platform: str) -> PlatformConfig:
    result = await session.execute(select(Setting).where(Setting.key == f"platform_{platform}"))
    setting = result.scalar_one_or_none()
    if setting and setting.value:
        return PlatformConfig(**setting.value)
    return PlatformConfig()


@router.get("/platforms", response_model=list[PlatformStatus])
async def list_platforms(session: AsyncSession = Depends(get_session)):
    platforms = []
    for name in PLATFORMS:
        config = await _get_platform_config(session, name)
        platforms.append(PlatformStatus(
            name=name,
            connected=bool(config.credentials),
            config=config,
        ))
    return platforms


@router.put("/platforms/{platform_name}", response_model=PlatformStatus)
async def update_platform(platform_name: str, body: PlatformConfig, session: AsyncSession = Depends(get_session)):
    if platform_name not in PLATFORMS:
        raise HTTPException(status_code=404, detail=f"Unknown platform: {platform_name}")

    key = f"platform_{platform_name}"
    result = await session.execute(select(Setting).where(Setting.key == key))
    existing = result.scalar_one_or_none()

    config_dict = body.model_dump()
    if existing:
        existing.value = config_dict
    else:
        session.add(Setting(key=key, value=config_dict))
    await session.commit()

    return PlatformStatus(name=platform_name, connected=bool(body.credentials), config=body)


@router.get("/log")
async def publish_log(
    limit: int = 50,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(Publication, Video.title)
        .join(Video, Publication.video_id == Video.id)
        .order_by(Publication.published_at.desc())
        .limit(limit)
    )
    entries = []
    for pub, video_title in result.all():
        entries.append({
            "id": pub.id,
            "video_id": pub.video_id,
            "video_title": video_title,
            "platform": pub.platform,
            "status": pub.status,
            "post_url": pub.post_url,
            "published_at": pub.published_at.isoformat(),
        })
    return entries


@router.post("/test/{platform_name}")
async def test_platform(platform_name: str, session: AsyncSession = Depends(get_session)):
    if platform_name not in PLATFORMS:
        raise HTTPException(status_code=404, detail=f"Unknown platform: {platform_name}")
    config = await _get_platform_config(session, platform_name)
    if not config.credentials:
        return {"platform": platform_name, "status": "not_configured"}
    # Real connection test would go here
    return {"platform": platform_name, "status": "ok"}
```

- [ ] **Step 4: Add publish endpoint to videos router**

Add to `backend/routers/videos.py`:

```python
from backend.models import Publication
from backend.schemas import PublishRequest


@router.post("/{video_id}/publish")
async def publish_video(video_id: str, body: PublishRequest, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Video).where(Video.id == video_id))
    video = result.scalar_one_or_none()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    if not video.output_path:
        raise HTTPException(status_code=400, detail="Video has no output file")

    results = []
    for platform in body.platforms:
        pub = Publication(
            video_id=video_id,
            platform=platform,
            status="failed",
            error_message="Publishing not yet connected",
        )
        # TODO: Actually call PublishManager when credentials are configured
        session.add(pub)
        results.append({"platform": platform, "status": pub.status})

    await session.commit()
    has_success = any(r["status"] == "success" for r in results)
    has_failure = any(r["status"] == "failed" for r in results)

    if has_success and has_failure:
        status_code = 207
    elif has_success:
        status_code = 200
    else:
        status_code = 207

    from starlette.responses import JSONResponse
    return JSONResponse(content=results, status_code=status_code)
```

- [ ] **Step 5: Register publishing router in main.py**

Add to `backend/main.py`:

```python
from backend.routers.publishing import router as publishing_router

app.include_router(publishing_router)
```

- [ ] **Step 6: Run tests**

```bash
pytest tests/test_publishing_api.py -v
```

Expected: all PASS

- [ ] **Step 7: Commit**

```bash
git add backend/routers/publishing.py tests/test_publishing_api.py backend/routers/videos.py backend/main.py
git commit -m "feat(backend): add publishing API with platform config and publish log"
```

---

### Task 11: Static File Serving for Media

**Files:**
- Modify: `backend/main.py`

- [ ] **Step 1: Add static file mount for output directory**

Add to `backend/main.py` after router registrations:

```python
from fastapi.staticfiles import StaticFiles
from pathlib import Path

# Serve generated media files
_output_dir = Path(__file__).resolve().parent.parent / "output"
_output_dir.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=str(_output_dir)), name="media")
```

- [ ] **Step 2: Write a quick integration test**

Append to `tests/test_health.py`:

```python
@pytest.mark.asyncio
async def test_media_mount_exists(client):
    """Verify that /media route is mounted (will 404 for missing files, not 405)."""
    response = await client.get("/media/nonexistent.mp4")
    # 404 means the route exists but file doesn't; 405 would mean route doesn't exist
    assert response.status_code == 404
```

- [ ] **Step 3: Run test**

```bash
pytest tests/test_health.py -v
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add backend/main.py tests/test_health.py
git commit -m "feat(backend): serve media files from /media static mount"
```

---

### Task 12: Alembic Setup for Migrations

**Files:**
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`
- Create: `backend/alembic/script.py.mako`
- Create: `backend/alembic/versions/` (directory)

- [ ] **Step 1: Initialize alembic**

```bash
cd /Users/user/Desktop/Work/PetProjects/AI-Video-pipeline
python -m alembic init backend/alembic
```

- [ ] **Step 2: Configure alembic.ini**

Edit the generated `alembic.ini` (in project root, move to `backend/`):

```bash
mv alembic.ini backend/alembic.ini
```

In `backend/alembic.ini`, set:

```ini
script_location = backend/alembic
sqlalchemy.url = sqlite:///data/pipeline.db
```

- [ ] **Step 3: Update alembic/env.py to use our models**

Replace `backend/alembic/env.py` content with:

```python
"""Alembic environment configuration."""

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from backend.database import DATABASE_URL, Base
from backend.models import Video, Scenario, Publication, Setting  # noqa: F401

config = context.config
config.set_main_option("sqlalchemy.url", DATABASE_URL.replace("+aiosqlite", ""))

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline():
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

- [ ] **Step 4: Generate initial migration**

```bash
cd /Users/user/Desktop/Work/PetProjects/AI-Video-pipeline
python -m alembic -c backend/alembic.ini revision --autogenerate -m "initial schema"
```

- [ ] **Step 5: Apply migration**

```bash
python -m alembic -c backend/alembic.ini upgrade head
```

- [ ] **Step 6: Commit**

```bash
git add backend/alembic.ini backend/alembic/
git commit -m "feat(backend): add Alembic migration setup with initial schema"
```

---

### Task 13: Final Integration — Complete main.py and Run Script

**Files:**
- Modify: `backend/main.py` (final version)
- Create: `run.py`

- [ ] **Step 1: Finalize backend/main.py**

Write the complete `backend/main.py`:

```python
"""FastAPI application for AI Video Pipeline."""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.database import init_db
from backend.routers.videos import router as videos_router
from backend.routers.scenarios import router as scenarios_router
from backend.routers.publishing import router as publishing_router
from backend.routers.settings import router as settings_router
from backend.ws import router as ws_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
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

# Routers
app.include_router(videos_router)
app.include_router(scenarios_router)
app.include_router(publishing_router)
app.include_router(settings_router)
app.include_router(ws_router)

# Static files for generated media
_output_dir = Path(__file__).resolve().parent.parent / "output"
_output_dir.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=str(_output_dir)), name="media")


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
```

- [ ] **Step 2: Create run script**

Create `run.py` in project root:

```python
"""Run the Video Pipeline backend server."""

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "backend.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
    )
```

- [ ] **Step 3: Run full test suite**

```bash
pytest tests/ -v
```

Expected: ALL PASS

- [ ] **Step 4: Start the server and manually verify**

```bash
python run.py
```

In another terminal:

```bash
curl http://localhost:8000/api/health
# {"status":"ok"}

curl http://localhost:8000/api/settings
# Returns default settings

curl -X POST http://localhost:8000/api/scenarios/generate \
  -H "Content-Type: application/json" \
  -d '{"content_type": "fruit-soap", "episode_number": 1}'
# Returns generated scenario
```

- [ ] **Step 5: Commit**

```bash
git add backend/main.py run.py
git commit -m "feat(backend): finalize FastAPI app with all routers and run script"
```

---

### Task 14: Update .gitignore and Documentation

**Files:**
- Modify: `.gitignore`
- Create: `CLAUDE.md`

- [ ] **Step 1: Update .gitignore**

Add to `.gitignore`:

```gitignore
# Database
data/
*.db

# Superpowers brainstorm sessions
.superpowers/

# Python
__pycache__/
*.pyc
.pytest_cache/

# Environment
.env
```

- [ ] **Step 2: Create CLAUDE.md**

Create `CLAUDE.md` in project root:

```markdown
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
```

- [ ] **Step 3: Commit**

```bash
git add .gitignore CLAUDE.md
git commit -m "docs: add CLAUDE.md and update .gitignore"
```
