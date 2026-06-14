"""Application-record request/response schemas."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class JobRef(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    job_id: uuid.UUID = Field(serialization_alias="jobId")
    title: str
    company: str | None = None
    city: str | None = None


class ApplicationCreate(BaseModel):
    job_id: uuid.UUID = Field(alias="jobId")
    report_id: uuid.UUID | None = Field(default=None, alias="reportId")
    status: str | None = Field(default=None, max_length=16)
    note: str | None = Field(default=None, max_length=2000)

    model_config = ConfigDict(populate_by_name=True)


class ApplicationUpdate(BaseModel):
    status: str | None = Field(default=None, max_length=16)
    note: str | None = Field(default=None, max_length=2000)
    applied_at: datetime | None = Field(default=None, alias="appliedAt")

    model_config = ConfigDict(populate_by_name=True)


class ApplicationOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: uuid.UUID
    job: JobRef
    report_id: uuid.UUID | None = Field(default=None, serialization_alias="reportId")
    status: str
    applied_at: datetime | None = Field(default=None, serialization_alias="appliedAt")
    note: str | None = None
    created_at: datetime = Field(serialization_alias="createdAt")
    updated_at: datetime = Field(serialization_alias="updatedAt")
