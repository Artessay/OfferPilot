"""Liveness and readiness probes."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import text

from app import __version__
from app.db.session import get_sessionmaker
from app.shared.config import get_settings
from app.shared.responses import Envelope, envelope

router = APIRouter(tags=["health"])


class HealthData(BaseModel):
    status: str
    service: str
    version: str
    environment: str


@router.get("/health", response_model=Envelope[HealthData], summary="Liveness probe")
async def health() -> Envelope[HealthData]:
    """Cheap liveness check — the process is up and serving."""
    settings = get_settings()
    return envelope(
        HealthData(
            status="ok",
            service=settings.app_name,
            version=__version__,
            environment=settings.environment,
        )
    )


class ReadyData(BaseModel):
    ready: bool
    checks: dict[str, str]


@router.get("/ready", response_model=Envelope[ReadyData], summary="Readiness probe")
async def ready() -> Envelope[ReadyData]:
    """Readiness check: verifies the database is reachable."""
    checks: dict[str, str] = {}
    ready = True
    try:
        factory = get_sessionmaker()
        async with factory() as session:
            await session.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception:
        checks["database"] = "unavailable"
        ready = False
    return envelope(ReadyData(ready=ready, checks=checks))
