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
