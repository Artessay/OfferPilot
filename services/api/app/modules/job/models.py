"""Job and JobAnalysis ORM models."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin
from app.db.types import JSONB

# Job source / status constants.
SOURCE_MANUAL = "manual"
SOURCE_FILE = "file"
SOURCE_ADMIN = "admin"
SOURCE_API = "api"

JOB_CREATED = "created"
JOB_PARSING = "parsing"
JOB_PARSED = "parsed"
JOB_FAILED = "failed"
JOB_DELETED = "deleted"


class Job(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, Base):
    """A job posting / JD to be matched against."""

    __tablename__ = "jobs"

    # Null user_id => admin/public job-library entry.
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True
    )
    title: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    company: Mapped[str | None] = mapped_column(String(128), index=True, nullable=True)
    city: Mapped[str | None] = mapped_column(String(64), nullable=True)
    source_type: Mapped[str] = mapped_column(String(16), default=SOURCE_MANUAL, nullable=False)
    source_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    jd_text: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(16), default=JOB_CREATED, nullable=False)


class JobAnalysis(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Structured representation of a JD (responsibilities, requirements, ...)."""

    __tablename__ = "job_analyses"
    job_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("jobs.id", ondelete="CASCADE"), index=True, nullable=False
    )
    responsibilities: Mapped[list[Any]] = mapped_column(JSONB, default=list, nullable=False)
    requirements: Mapped[list[Any]] = mapped_column(JSONB, default=list, nullable=False)
    hard_skills: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    soft_skills: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    keywords: Mapped[list[Any]] = mapped_column(JSONB, default=list, nullable=False)
    bonus_points: Mapped[list[Any]] = mapped_column(JSONB, default=list, nullable=False)
    seniority_level: Mapped[str | None] = mapped_column(String(32), nullable=True)
    embedding: Mapped[list[float] | None] = mapped_column(JSONB, nullable=True)
    model_version: Mapped[str | None] = mapped_column(String(64), nullable=True)
    prompt_version: Mapped[str | None] = mapped_column(String(64), nullable=True)


class JobFavorite(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A user's bookmark of a job (one row per user+job)."""

    __tablename__ = "job_favorites"
    __table_args__ = (UniqueConstraint("user_id", "job_id", name="uq_job_favorite_user_job"),)

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    job_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("jobs.id", ondelete="CASCADE"), index=True, nullable=False
    )
