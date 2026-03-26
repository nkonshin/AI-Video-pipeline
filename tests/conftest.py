"""Shared test fixtures."""

import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from backend.main import app


@pytest_asyncio.fixture
async def client():
    """Async test client for FastAPI app."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
