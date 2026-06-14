"""ResumeRewriteTask ORM model."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import ForeignKey, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.db.types import JSONB

# Rewrite task states.
REWRITE_QUEUED = "queued"
REWRITE_RUNNING = "running"
REWRITE_DRAFTED = "drafted"
REWRITE_CONFIRMED = "confirmed"
REWRITE_DISCARDED = "discarded"
REWRITE_FAILED = "failed"


class ResumeRewriteTask(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """An AI rewrite task generating a resume draft from accepted suggestions."""

    __tablename__ = "resume_rewrite_tasks"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    resume_version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("resume_versions.id", ondelete="CASCADE"), index=True, nullable=False
    )
    report_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("match_reports.id", ondelete="SET NULL"), nullable=True
    )
    suggestion_ids: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    status: Mapped[str] = mapped_column(
        String(16), default=REWRITE_QUEUED, index=True, nullable=False
    )
    original_segments: Mapped[list[Any]] = mapped_column(JSONB, default=list, nullable=False)
    rewritten_segments: Mapped[list[Any]] = mapped_column(JSONB, default=list, nullable=False)
    diff_summary: Mapped[list[Any]] = mapped_column(JSONB, default=list, nullable=False)
    # Weak reference to the new resume_version created on confirm (no FK to keep
    # the task decoupled from version lifecycle).
    new_resume_version_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, nullable=True)
