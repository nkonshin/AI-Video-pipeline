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
        "enabled": True, "hashtags": ["shorts", "ai"], "caption_template": "{title} | AI generated",
    })
    assert response.status_code == 200
    assert response.json()["config"]["hashtags"] == ["shorts", "ai"]


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
    assert data[0]["video_title"] == "V1"


@pytest.mark.asyncio
async def test_publish_video(client, db_session):
    video = Video(title="V", content_type="custom", status="completed", scenario_config={}, output_path="/tmp/test.mp4")
    db_session.add(video)
    await db_session.commit()
    response = await client.post(f"/api/videos/{video.id}/publish", json={"platforms": ["telegram"]})
    assert response.status_code in (200, 207)
