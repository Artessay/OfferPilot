"""Match request/response schemas."""

from __future__ import annotations

import uuid

from pydantic import BaseModel, ConfigDict, Field


class MatchCreate(BaseModel):
    resume_version_id: uuid.UUID = Field(alias="resumeVersionId")
    job_id: uuid.UUID = Field(alias="jobId")
    profile_id: uuid.UUID | None = Field(default=None, alias="profileId")

    model_config = ConfigDict(populate_by_name=True)


class MatchTaskOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    match_task_id: uuid.UUID = Field(serialization_alias="matchTaskId")
    status: str
    progress: int
    estimated_seconds: int = Field(default=0, serialization_alias="estimatedSeconds")
    report_id: uuid.UUID | None = Field(default=None, serialization_alias="reportId")
    error_code: str | None = Field(default=None, serialization_alias="errorCode")
