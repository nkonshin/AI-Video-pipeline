"""Database model tests."""

import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from backend.models import Base, Video, Scenario, Publication, Setting


@pytest_asyncio.fixture
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
