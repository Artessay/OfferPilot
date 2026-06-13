"""Request-scoped context propagated through logs and responses."""

from __future__ import annotations

import uuid
from contextvars import ContextVar

_request_id_ctx: ContextVar[str] = ContextVar("request_id", default="-")


def new_request_id() -> str:
    """Generate a short, sortable-ish request id."""
    return f"req_{uuid.uuid4().hex[:16]}"


def set_request_id(request_id: str) -> None:
    _request_id_ctx.set(request_id)


def get_request_id() -> str:
    return _request_id_ctx.get()
