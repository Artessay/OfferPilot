"""RecommendationList and RecommendationItem ORM models."""

from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

# Strategy constants.
STRATEGY_BALANCED = "balanced"
STRATEGY_AGGRESSIVE = "aggressive"
STRATEGY_CONSERVATIVE = "conservative"

# Opportunity tiers.
TIER_EXPLORATORY = "exploratory"
TIER_PRIORITY = "priority"
TIER_BASELINE = "baseline"

# Risk levels.
RISK_LOW = "low"
RISK_MEDIUM = "medium"
RISK_HIGH = "high"


class RecommendationList(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A tiered recommendation combo produced for one job-seeking goal."""

    __tablename__ = "recommendation_lists"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    discovery_task_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("job_discovery_tasks.id", ondelete="SET NULL"), index=True, nullable=True
    )
    resume_version_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("resume_versions.id", ondelete="SET NULL"), nullable=True
    )
    strategy: Mapped[str] = mapped_column(String(16), default=STRATEGY_BALANCED, nullable=False)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)


class RecommendationItem(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A single tiered job entry within a recommendation list."""

    __tablename__ = "recommendation_items"

    recommendation_list_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("recommendation_lists.id", ondelete="CASCADE"), index=True, nullable=False
    )
    job_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False
    )
    report_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("match_reports.id", ondelete="SET NULL"), nullable=True
    )
    tier: Mapped[str] = mapped_column(String(16), index=True, nullable=False)
    match_score: Mapped[int] = mapped_column(Integer, nullable=False)
    success_probability: Mapped[float | None] = mapped_column(Numeric(4, 3), nullable=True)
    opportunity_value: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    risk_level: Mapped[str] = mapped_column(String(16), default=RISK_MEDIUM, nullable=False)
    tier_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    suggested_action: Mapped[str | None] = mapped_column(Text, nullable=True)
