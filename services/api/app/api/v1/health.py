"""Liveness and readiness probes."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from app import __version__
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
    """Readiness check.

    Dependency checks (database, redis) are wired in once those datastores are
    introduced in phase P1. For now the service is ready as soon as it boots.
    """
    checks: dict[str, str] = {}
    return envelope(ReadyData(ready=True, checks=checks))
