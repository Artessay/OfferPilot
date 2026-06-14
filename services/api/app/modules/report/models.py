"""MatchReport and OptimizationSuggestion ORM models."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.db.types import JSONB

# Match levels.
LEVEL_LOW = "low"
LEVEL_MEDIUM = "medium"
LEVEL_HIGH = "high"
LEVEL_EXCELLENT = "excellent"

# Suggestion categories.
CAT_KEYWORD = "keyword"
CAT_EXPERIENCE = "experience"
CAT_STRUCTURE = "structure"
CAT_IMPACT = "impact"
CAT_RISK = "risk"

# Suggestion priorities and statuses.
PRIORITY_HIGH = "high"
PRIORITY_MEDIUM = "medium"
PRIORITY_LOW = "low"

SUGGESTION_TODO = "todo"
SUGGESTION_ACCEPTED = "accepted"
SUGGESTION_DISMISSED = "dismissed"


class MatchReport(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """The analysis output of a match task."""

    __tablename__ = "match_reports"

    match_task_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("match_tasks.id", ondelete="CASCADE"), index=True, nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    job_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("jobs.id", ondelete="CASCADE"), index=True, nullable=False
    )
    resume_version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("resume_versions.id", ondelete="CASCADE"), nullable=False
    )
    overall_score: Mapped[int] = mapped_column(Integer, nullable=False)
    match_level: Mapped[str] = mapped_column(String(16), nullable=False)
    dimension_scores: Mapped[list[Any]] = mapped_column(JSONB, default=list, nullable=False)
    strengths: Mapped[list[Any]] = mapped_column(JSONB, default=list, nullable=False)
    gaps: Mapped[list[Any]] = mapped_column(JSONB, default=list, nullable=False)
    risks: Mapped[list[Any]] = mapped_column(JSONB, default=list, nullable=False)
    evidence: Mapped[list[Any]] = mapped_column(JSONB, default=list, nullable=False)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    scoring_version: Mapped[str | None] = mapped_column(String(64), nullable=True)
    model_version: Mapped[str | None] = mapped_column(String(64), nullable=True)
    prompt_version: Mapped[str | None] = mapped_column(String(64), nullable=True)


class OptimizationSuggestion(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A single actionable resume-optimization suggestion tied to a report."""

    __tablename__ = "optimization_suggestions"

    report_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("match_reports.id", ondelete="CASCADE"), index=True, nullable=False
    )
    category: Mapped[str] = mapped_column(String(16), nullable=False)
    priority: Mapped[str] = mapped_column(String(16), default=PRIORITY_MEDIUM, nullable=False)
    problem: Mapped[str | None] = mapped_column(Text, nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    suggestion: Mapped[str | None] = mapped_column(Text, nullable=True)
    example: Mapped[str | None] = mapped_column(Text, nullable=True)
    evidence_refs: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    rewritable: Mapped[bool] = mapped_column(default=True, nullable=False)
    status: Mapped[str] = mapped_column(
        String(16), default=SUGGESTION_TODO, index=True, nullable=False
    )
