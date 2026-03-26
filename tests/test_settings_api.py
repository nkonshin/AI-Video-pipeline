"""Settings API tests."""

import pytest
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

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
