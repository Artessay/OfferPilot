"""Report request/response schemas."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class JobRef(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    job_id: uuid.UUID = Field(serialization_alias="jobId")
    title: str
    company: str | None = None


class SuggestionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: uuid.UUID
    category: str
    priority: str
    problem: str | None = None
    reason: str | None = None
    suggestion: str | None = None
    example: str | None = None
    evidence_refs: list[str] = Field(serialization_alias="evidenceRefs")
    rewritable: bool
    status: str


class ReportSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: uuid.UUID
    job_id: uuid.UUID = Field(serialization_alias="jobId")
    resume_version_id: uuid.UUID = Field(serialization_alias="resumeVersionId")
    overall_score: int = Field(serialization_alias="overallScore")
    match_level: str = Field(serialization_alias="matchLevel")
    summary: str | None = None
    created_at: datetime = Field(serialization_alias="createdAt")


class ReportDetail(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: uuid.UUID
    job: JobRef
    resume_version_id: uuid.UUID = Field(serialization_alias="resumeVersionId")
    overall_score: int = Field(serialization_alias="overallScore")
    match_level: str = Field(serialization_alias="matchLevel")
    dimension_scores: list[dict[str, Any]] = Field(serialization_alias="dimensionScores")
    strengths: list[dict[str, Any]]
    gaps: list[dict[str, Any]]
    risks: list[dict[str, Any]]
    evidence: list[dict[str, Any]]
    summary: str | None = None
    suggestions: list[SuggestionOut]
    scoring_version: str | None = Field(default=None, serialization_alias="scoringVersion")
    created_at: datetime = Field(serialization_alias="createdAt")


class SuggestionUpdate(BaseModel):
    status: str = Field(pattern="^(todo|accepted|dismissed)$")
    note: str | None = None


class RegenerateRequest(BaseModel):
    focus_area: str | None = Field(default=None, alias="focusArea")

    model_config = ConfigDict(populate_by_name=True)
