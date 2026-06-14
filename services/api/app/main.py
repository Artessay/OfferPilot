"""FastAPI application factory and ASGI entrypoint.

Run locally with::

    uvicorn app.main:app --reload
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.api.v1 import api_router
from app.shared.config import get_settings
from app.shared.errors import register_exception_handlers
from app.shared.logging import configure_logging, get_logger
from app.shared.middleware import RequestContextMiddleware


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """Startup/shutdown hooks (db pool, redis, etc. are added in later phases)."""
    logger = get_logger(__name__)
    settings = get_settings()
    logger.info("api_startup", environment=settings.environment, version=__version__)
    yield
    from app.db.session import dispose_engine

    await dispose_engine()
    logger.info("api_shutdown")


def create_app() -> FastAPI:
    """Build and configure the FastAPI application."""
    configure_logging()
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=__version__,
        description="OfferPilot (Offer 捕手) — student job-matching AI assistant API.",
        openapi_url=f"{settings.api_v1_prefix}/openapi.json",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # Order matters: request-id first so it is available to everything else.
    app.add_middleware(RequestContextMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID"],
    )

    register_exception_handlers(app)
    app.include_router(api_router, prefix=settings.api_v1_prefix)

    return app


app = create_app()
