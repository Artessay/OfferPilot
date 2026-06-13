"""Shared pytest fixtures.

Environment defaults are set *before* importing the app so cached settings pick
up the test configuration (no real database/redis/LLM keys required).
"""

from __future__ import annotations

import os

os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("LOG_JSON", "false")
os.environ.setdefault("AI_PROVIDER", "fake")
os.environ.setdefault("JWT_SECRET", "test-secret")

from collections.abc import AsyncIterator

import pytest
from app.main import create_app
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient


@pytest.fixture
def app() -> FastAPI:
    return create_app()


@pytest.fixture
async def client(app: FastAPI) -> AsyncIterator[AsyncClient]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
