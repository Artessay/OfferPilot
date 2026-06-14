"""Job discovery request/response schemas."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class DiscoveryFilters(BaseModel):
    target_roles: list[str] = Field(default_factory=list, alias="targetRoles")
    cities: list[str] = Field(default_factory=list)
    job_type: str | None = Field(default=None, alias="jobType")
    max_candidates: int = Field(default=50, ge=1, le=200, alias="maxCandidates")

    model_config = ConfigDict(populate_by_name=True)


class DiscoveryCreate(BaseModel):
    profile_id: uuid.UUID | None = Field(default=None, alias="profileId")
    resume_version_id: uuid.UUID | None = Field(default=None, alias="resumeVersionId")
    source_ids: list[uuid.UUID] = Field(default_factory=list, alias="sourceIds")
    filters: DiscoveryFilters = Field(default_factory=DiscoveryFilters)

    model_config = ConfigDict(populate_by_name=True)


class DiscoveryTaskOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    discovery_task_id: uuid.UUID = Field(serialization_alias="discoveryTaskId")
    status: str
    candidate_count: int = Field(serialization_alias="candidateCount")
    estimated_seconds: int = Field(default=0, serialization_alias="estimatedSeconds")
    error_code: str | None = Field(default=None, serialization_alias="errorCode")


class CandidateOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: uuid.UUID
    job_id: uuid.UUID = Field(serialization_alias="jobId")
    title: str
    company: str | None = None
    city: str | None = None
    initial_reason: str | None = Field(default=None, serialization_alias="initialReason")
    eligibility_status: str = Field(serialization_alias="eligibilityStatus")


class SourceConfigOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: uuid.UUID
    source_type: str = Field(serialization_alias="sourceType")
    source_name: str = Field(serialization_alias="sourceName")
    auth_status: str = Field(serialization_alias="authStatus")
    last_synced_at: datetime | None = Field(default=None, serialization_alias="lastSyncedAt")


class AuthorizeRequest(BaseModel):
    source_type: str = Field(alias="sourceType")
    source_name: str = Field(alias="sourceName", max_length=128)
    scope: dict[str, object] = Field(default_factory=dict)

    model_config = ConfigDict(populate_by_name=True)
