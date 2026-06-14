"""Recommendation request/response schemas."""

from __future__ import annotations

import uuid

from pydantic import BaseModel, ConfigDict, Field


class RecommendationCreate(BaseModel):
    discovery_task_id: uuid.UUID = Field(alias="discoveryTaskId")
    resume_version_id: uuid.UUID | None = Field(default=None, alias="resumeVersionId")
    strategy: str = Field(default="balanced", pattern="^(balanced|aggressive|conservative)$")

    model_config = ConfigDict(populate_by_name=True)


class TierItemOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    job_id: uuid.UUID = Field(serialization_alias="jobId")
    title: str
    company: str | None = None
    match_score: int = Field(serialization_alias="matchScore")
    success_probability: float = Field(serialization_alias="successProbability")
    opportunity_value: int = Field(serialization_alias="opportunityValue")
    risk_level: str = Field(serialization_alias="riskLevel")
    tier_reason: str = Field(serialization_alias="tierReason")
    suggested_action: str = Field(serialization_alias="suggestedAction")


class TierGroupOut(BaseModel):
    tier: str
    name: str
    items: list[TierItemOut]


class RecommendationOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    recommendation_id: uuid.UUID = Field(serialization_alias="recommendationId")
    strategy: str
    summary: str | None = None
    tiers: list[TierGroupOut]
