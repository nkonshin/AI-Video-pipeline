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
    assert len(response.json()) == 2


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
    response = await client.post("/api/scenarios/generate", json={"content_type": "fruit-soap", "episode_number": 2})
    assert response.status_code == 200
    data = response.json()
    assert data["content_type"] == "fruit-soap"
    assert len(data["config"]["scenes"]) > 0


@pytest.mark.asyncio
async def test_generate_character_remix(client):
    response = await client.post("/api/scenarios/generate", json={"content_type": "character-remix", "character_name": "Шрек", "context_index": 0})
    assert response.status_code == 200
    assert "Шрек" in response.json()["config"]["title"]


@pytest.mark.asyncio
async def test_generate_mascot(client):
    response = await client.post("/api/scenarios/generate", json={"content_type": "mascot", "business_type": "кофейня"})
    assert response.status_code == 200
    assert len(response.json()["config"]["scenes"]) > 0


@pytest.mark.asyncio
async def test_generate_unknown_type(client):
    response = await client.post("/api/scenarios/generate", json={"content_type": "unknown-type"})
    assert response.status_code == 400
