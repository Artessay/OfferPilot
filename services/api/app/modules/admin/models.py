"""PromptTemplate and ScoringRule ORM models (versioned configuration)."""

from __future__ import annotations

from typing import Any

from sqlalchemy import Boolean, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.db.types import JSONB


class PromptTemplate(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A versioned LLM prompt template (resume_parse, job_parse, ...)."""

    __tablename__ = "prompt_templates"
    __table_args__ = (UniqueConstraint("name", "version", name="uq_prompt_name_version"),)

    name: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    version: Mapped[str] = mapped_column(String(32), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    schema_version: Mapped[str | None] = mapped_column(String(32), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class ScoringRule(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A versioned set of match-scoring dimension weights."""

    __tablename__ = "scoring_rules"
    __table_args__ = (UniqueConstraint("name", "version", name="uq_scoring_name_version"),)

    name: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    version: Mapped[str] = mapped_column(String(32), nullable=False)
    weights: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
