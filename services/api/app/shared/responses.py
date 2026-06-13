"""Standard success-response envelope and pagination helpers.

All successful responses are wrapped as::

    {"data": <payload>, "requestId": "...", "timestamp": "..."}
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field

from app.shared.context import get_request_id

T = TypeVar("T")


class Envelope(BaseModel, Generic[T]):
    """Generic success envelope. Use as ``response_model=Envelope[MyModel]``."""

    model_config = ConfigDict(populate_by_name=True)

    data: T
    request_id: str = Field(serialization_alias="requestId")
    timestamp: datetime


class PageMeta(BaseModel):
    page: int
    page_size: int = Field(serialization_alias="pageSize")
    total: int
    total_pages: int = Field(serialization_alias="totalPages")


class Page(BaseModel, Generic[T]):
    """Paginated list payload (goes inside ``Envelope.data``)."""

    items: list[T]
    meta: PageMeta


def envelope(data: T) -> Envelope[T]:
    """Wrap ``data`` in the standard success envelope."""
    return Envelope[T](
        data=data,
        request_id=get_request_id(),
        timestamp=datetime.now(UTC),
    )


def paginate(items: list[T], *, page: int, page_size: int, total: int) -> Page[T]:
    total_pages = (total + page_size - 1) // page_size if page_size else 0
    return Page[T](
        items=items,
        meta=PageMeta(
            page=page,
            page_size=page_size,
            total=total,
            total_pages=total_pages,
        ),
    )
