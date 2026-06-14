"""Job-source config, discovery task and discovered-candidate ORM models."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.db.types import JSONB

# Source types.
SOURCE_ADMIN = "admin"
SOURCE_SCHOOL = "school"
SOURCE_THIRD_PARTY_API = "third_party_api"
SOURCE_MANUAL_BATCH = "manual_batch"

# Authorization states.
AUTH_UNAUTHORIZED = "unauthorized"
AUTH_AUTHORIZED = "authorized"
AUTH_EXPIRED = "expired"
AUTH_REVOKED = "revoked"

# Discovery task states.
TASK_QUEUED = "queued"
TASK_RUNNING = "running"
TASK_SUCCEEDED = "succeeded"
TASK_FAILED = "failed"
TASK_CANCELLED = "cancelled"

# Candidate eligibility.
ELIGIBLE = "eligible"
ELIGIBILITY_RISK = "risk"
INELIGIBLE = "ineligible"


class JobSourceConfig(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """An authorized source the system may pull candidate jobs from."""

    __tablename__ = "job_source_configs"

    user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True
    )
    source_type: Mapped[str] = mapped_column(String(32), nullable=False)
    source_name: Mapped[str] = mapped_column(String(128), nullable=False)
    auth_status: Mapped[str] = mapped_column(String(16), default=AUTH_UNAUTHORIZED, nullable=False)
    scope: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class JobDiscoveryTask(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """An AI job-discovery run scoped to a profile + resume version."""

    __tablename__ = "job_discovery_tasks"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    profile_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True
    )
    resume_version_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("resume_versions.id", ondelete="SET NULL"), nullable=True
    )
    source_ids: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    filters: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    status: Mapped[str] = mapped_column(String(16), default=TASK_QUEUED, index=True, nullable=False)
    candidate_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class DiscoveredJobCandidate(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A candidate job surfaced by a discovery task."""

    __tablename__ = "discovered_job_candidates"

    discovery_task_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("job_discovery_tasks.id", ondelete="CASCADE"), index=True, nullable=False
    )
    job_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("jobs.id", ondelete="CASCADE"), index=True, nullable=False
    )
    source_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("job_source_configs.id", ondelete="SET NULL"), nullable=True
    )
    source_rank: Mapped[int | None] = mapped_column(Integer, nullable=True)
    initial_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    eligibility_status: Mapped[str] = mapped_column(String(16), default=ELIGIBLE, nullable=False)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
