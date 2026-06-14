"""Resume and ResumeVersion ORM models."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin
from app.db.types import JSONB

# Resume processing status constants.
RESUME_UPLOADED = "uploaded"
RESUME_PARSING = "parsing"
RESUME_PARSED = "parsed"
RESUME_FAILED = "failed"
RESUME_DELETED = "deleted"


class Resume(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, Base):
    """An uploaded resume file and its processing state."""

    __tablename__ = "resumes"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(128), nullable=False)
    file_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    file_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    file_type: Mapped[str | None] = mapped_column(String(32), nullable=True)
    file_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(16), default=RESUME_UPLOADED, nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class ResumeVersion(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A point-in-time snapshot of parsed/optimised resume content."""

    __tablename__ = "resume_versions"
    __table_args__ = (UniqueConstraint("resume_id", "version_no", name="uq_resume_version_no"),)

    resume_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("resumes.id", ondelete="CASCADE"), index=True, nullable=False
    )
    version_no: Mapped[int] = mapped_column(Integer, nullable=False)
    # Weak reference to the report that prompted this version (no FK to avoid a
    # circular dependency: reports reference resume_versions).
    source_report_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, nullable=True)
    raw_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    structured_data: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    skill_tags: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    embedding: Mapped[list[float] | None] = mapped_column(JSONB, nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
