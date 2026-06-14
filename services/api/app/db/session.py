"""Async database engine, session factory and FastAPI dependency."""

from __future__ import annotations

from collections.abc import AsyncIterator

from sqlalchemy import event
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.shared.config import get_settings

_engine: AsyncEngine | None = None
_sessionmaker: async_sessionmaker[AsyncSession] | None = None


def _enable_sqlite_fk(engine: AsyncEngine) -> None:
    """Enable foreign-key enforcement on SQLite (needed for ON DELETE CASCADE)."""

    @event.listens_for(engine.sync_engine, "connect")
    def _set_pragma(dbapi_connection: object, _: object) -> None:
        cursor = dbapi_connection.cursor()  # type: ignore[attr-defined]
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


def _build_engine() -> AsyncEngine:
    settings = get_settings()
    # SQLite (tests) needs a shared connection pool to keep the in-memory DB
    # alive across sessions; Postgres uses the default pooled engine.
    connect_args: dict[str, object] = {}
    kwargs: dict[str, object] = {"echo": False, "future": True, "pool_pre_ping": True}
    is_sqlite = settings.database_url.startswith("sqlite")
    if is_sqlite:
        from sqlalchemy.pool import StaticPool

        connect_args["check_same_thread"] = False
        kwargs["poolclass"] = StaticPool
        kwargs.pop("pool_pre_ping", None)
    engine = create_async_engine(settings.database_url, connect_args=connect_args, **kwargs)
    if is_sqlite:
        _enable_sqlite_fk(engine)
    return engine


def get_engine() -> AsyncEngine:
    """Return the process-wide async engine, building it on first use."""
    global _engine
    if _engine is None:
        _engine = _build_engine()
    return _engine


def get_sessionmaker() -> async_sessionmaker[AsyncSession]:
    """Return the process-wide async session factory."""
    global _sessionmaker
    if _sessionmaker is None:
        _sessionmaker = async_sessionmaker(
            bind=get_engine(),
            expire_on_commit=False,
            autoflush=False,
        )
    return _sessionmaker


async def get_session() -> AsyncIterator[AsyncSession]:
    """FastAPI dependency yielding a transactional session.

    Commits on success, rolls back on error, always closes.
    """
    factory = get_sessionmaker()
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def dispose_engine() -> None:
    """Dispose of the engine (called on application shutdown)."""
    global _engine, _sessionmaker
    if _engine is not None:
        await _engine.dispose()
        _engine = None
        _sessionmaker = None
