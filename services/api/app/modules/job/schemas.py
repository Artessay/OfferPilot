"""Job request/response schemas."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class JobCreate(BaseModel):
    title: str = Field(min_length=1, max_length=128)
    company: str | None = Field(default=None, max_length=128)
    city: str | None = Field(default=None, max_length=64)
    source_type: str = Field(default="manual", alias="sourceType")
    source_url: str | None = Field(default=None, alias="sourceUrl", max_length=512)
    jd_text: str = Field(alias="jdText", min_length=1)

    model_config = ConfigDict(populate_by_name=True)


class JobUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=128)
    company: str | None = Field(default=None, max_length=128)
    city: str | None = Field(default=None, max_length=64)
    jd_text: str | None = Field(default=None, alias="jdText")

    model_config = ConfigDict(populate_by_name=True)


class JobAnalysisOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: uuid.UUID
    responsibilities: list[Any]
    requirements: list[Any]
    hard_skills: list[str] = Field(serialization_alias="hardSkills")
    soft_skills: list[str] = Field(serialization_alias="softSkills")
    keywords: list[Any]
    bonus_points: list[Any] = Field(serialization_alias="bonusPoints")
    seniority_level: str | None = Field(default=None, serialization_alias="seniorityLevel")


class JobSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: uuid.UUID
    title: str
    company: str | None = None
    city: str | None = None
    source_type: str = Field(serialization_alias="sourceType")
    status: str
    created_at: datetime = Field(serialization_alias="createdAt")


class JobDetail(JobSummary):
    jd_text: str = Field(serialization_alias="jdText")
    analysis: JobAnalysisOut | None = None


class JobImportResult(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    created_count: int = Field(serialization_alias="createdCount")
    items: list[JobSummary]
    errors: list[str]
