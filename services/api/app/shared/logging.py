"""Structured logging configuration based on structlog.

Logs are emitted as JSON in non-local environments (easy to ship to a log
platform) and as colourised console output locally. The current ``request_id``
is automatically attached to every log line.
"""

from __future__ import annotations

import logging
import sys
from typing import cast

import structlog

from app.shared.config import get_settings
from app.shared.context import get_request_id


def _add_request_id(
    _: structlog.types.WrappedLogger,
    __: str,
    event_dict: structlog.types.EventDict,
) -> structlog.types.EventDict:
    event_dict.setdefault("request_id", get_request_id())
    return event_dict


def configure_logging() -> None:
    """Configure stdlib logging + structlog once at startup."""
    settings = get_settings()
    level = getattr(logging, settings.log_level.upper(), logging.INFO)

    shared_processors: list[structlog.types.Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        _add_request_id,
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]

    renderer: structlog.types.Processor = (
        structlog.processors.JSONRenderer()
        if settings.log_json
        else structlog.dev.ConsoleRenderer()
    )

    structlog.configure(
        processors=[*shared_processors, renderer],
        wrapper_class=structlog.make_filtering_bound_logger(level),
        logger_factory=structlog.PrintLoggerFactory(file=sys.stdout),
        cache_logger_on_first_use=True,
    )

    logging.basicConfig(format="%(message)s", stream=sys.stdout, level=level)
    # Silence overly chatty libraries unless debugging.
    for noisy in ("uvicorn.access", "asyncio"):
        logging.getLogger(noisy).setLevel(max(level, logging.WARNING))


def get_logger(name: str | None = None) -> structlog.stdlib.BoundLogger:
    return cast("structlog.stdlib.BoundLogger", structlog.get_logger(name))
