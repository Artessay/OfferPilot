"""Resume request/response schemas."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ResumeVersionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: uuid.UUID
    version_no: int = Field(serialization_alias="versionNo")
    source_report_id: uuid.UUID | None = Field(default=None, serialization_alias="sourceReportId")
    structured_data: dict[str, Any] = Field(serialization_alias="structuredData")
    skill_tags: list[str] = Field(serialization_alias="skillTags")
    summary: str | None = None
    created_at: datetime = Field(serialization_alias="createdAt")


class ResumeSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: uuid.UUID
    title: str
    file_name: str | None = Field(default=None, serialization_alias="fileName")
    status: str
    is_default: bool = Field(serialization_alias="isDefault")
    created_at: datetime = Field(serialization_alias="createdAt")


class ResumeDetail(ResumeSummary):
    latest_version: ResumeVersionOut | None = Field(
        default=None, serialization_alias="latestVersion"
    )


class ResumeVersionCreate(BaseModel):
    source_report_id: uuid.UUID | None = Field(default=None, alias="sourceReportId")
    raw_text: str = Field(alias="content", min_length=1)
    summary: str | None = None

    model_config = ConfigDict(populate_by_name=True)
