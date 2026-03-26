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
