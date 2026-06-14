"""Shared pytest fixtures.

Environment defaults are set *before* importing the app so cached settings pick
up the test configuration. Tests run against an isolated in-memory SQLite
database (no external services or LLM keys required).
"""

from __future__ import annotations

import os
import tempfile

os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("LOG_JSON", "false")
os.environ.setdefault("AI_PROVIDER", "fake")
os.environ.setdefault("JWT_SECRET", "test-secret-key-at-least-32-bytes-long-000")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("STORAGE_LOCAL_DIR", tempfile.mkdtemp(prefix="offerpilot_test_storage_"))

from collections.abc import AsyncIterator

import pytest
from app.db.registry import Base
from app.db.session import get_session
from app.main import create_app
from httpx import ASGITransport, AsyncClient
from sqlalchemy import event
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import StaticPool


@pytest.fixture
async def engine() -> AsyncIterator[AsyncEngine]:
    """A fresh in-memory SQLite engine with the full schema, per test."""
    eng = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(eng.sync_engine, "connect")
    def _fk_on(dbapi_connection: object, _: object) -> None:
        cursor = dbapi_connection.cursor()  # type: ignore[attr-defined]
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    await eng.dispose()


@pytest.fixture
async def sessionmaker(engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(bind=engine, expire_on_commit=False, autoflush=False)


@pytest.fixture
async def session(
    sessionmaker: async_sessionmaker[AsyncSession],
) -> AsyncIterator[AsyncSession]:
    async with sessionmaker() as s:
        yield s


@pytest.fixture
async def client(
    sessionmaker: async_sessionmaker[AsyncSession],
) -> AsyncIterator[AsyncClient]:
    """An HTTP client whose DB session is bound to the test database."""
    app = create_app()

    async def _override_session() -> AsyncIterator[AsyncSession]:
        async with sessionmaker() as s:
            try:
                yield s
                await s.commit()
            except Exception:
                await s.rollback()
                raise

    app.dependency_overrides[get_session] = _override_session
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture
async def auth_headers(client: AsyncClient) -> dict[str, str]:
    """Register a user and return Authorization headers for it."""
    resp = await client.post(
        "/api/v1/auth/register",
        json={"email": "user@example.com", "password": "pa55word!", "nickname": "测试用户"},
    )
    token = resp.json()["data"]["tokens"]["accessToken"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def second_auth_headers(client: AsyncClient) -> dict[str, str]:
    """Register a second, distinct user (for cross-user isolation tests)."""
    resp = await client.post(
        "/api/v1/auth/register",
        json={"email": "other@example.com", "password": "pa55word!", "nickname": "其他用户"},
    )
    token = resp.json()["data"]["tokens"]["accessToken"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def admin_auth_headers(
    client: AsyncClient,
    sessionmaker: async_sessionmaker[AsyncSession],
) -> dict[str, str]:
    """Register a user, promote it to admin, and return its auth headers."""
    from app.modules.auth.models import ROLE_ADMIN, User
    from sqlalchemy import update

    resp = await client.post(
        "/api/v1/auth/register",
        json={"email": "admin@example.com", "password": "pa55word!", "nickname": "管理员"},
    )
    token = resp.json()["data"]["tokens"]["accessToken"]
    async with sessionmaker() as s:
        await s.execute(
            update(User).where(User.email == "admin@example.com").values(role=ROLE_ADMIN)
        )
        await s.commit()
    return {"Authorization": f"Bearer {token}"}
