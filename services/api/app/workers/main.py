"""Arq worker entrypoint.

Start with::

    arq app.workers.main.WorkerSettings

Task functions (resume parsing, JD parsing, matching, recommendation,
rewrite, ...) are registered in ``FUNCTIONS`` as they are implemented in
later phases. Keeping the worker wiring here means the same Redis/queue
configuration is reused everywhere.
"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any, ClassVar

from arq.connections import RedisSettings

from app.shared.config import get_settings
from app.shared.logging import configure_logging, get_logger

logger = get_logger(__name__)


async def ping(ctx: dict[str, Any]) -> str:
    """Trivial registered task so the worker can start.

    Real task functions (parse_resume, parse_job, run_match, run_discovery,
    generate_recommendation, rewrite_resume, ...) are appended to ``FUNCTIONS``
    in later phases.
    """
    logger.info("worker_ping")
    return "pong"


# Task callables registered with the worker. Arq requires at least one.
FUNCTIONS: Sequence[Any] = (ping,)


async def startup(_: dict[str, Any]) -> None:
    configure_logging()
    logger.info("worker_startup")


async def shutdown(_: dict[str, Any]) -> None:
    logger.info("worker_shutdown")


def _redis_settings() -> RedisSettings:
    return RedisSettings.from_dsn(get_settings().redis_url)


class WorkerSettings:
    """Arq worker configuration object."""

    functions: ClassVar[list[Any]] = list(FUNCTIONS)
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = _redis_settings()
    max_jobs = 10
    job_timeout = 300
