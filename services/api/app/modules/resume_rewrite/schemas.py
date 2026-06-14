"""Resume rewrite request/response schemas."""

from __future__ import annotations

import uuid

from pydantic import BaseModel, ConfigDict, Field


class RewriteCreate(BaseModel):
    resume_version_id: uuid.UUID = Field(alias="resumeVersionId")
    report_id: uuid.UUID = Field(alias="reportId")
    suggestion_ids: list[uuid.UUID] = Field(default_factory=list, alias="suggestionIds")

    model_config = ConfigDict(populate_by_name=True)


class DiffBlockOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    section: str
    original: str
    rewritten: str
    reason: str
    risk_warning: str = Field(serialization_alias="riskWarning")


class RewriteTaskOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    rewrite_task_id: uuid.UUID = Field(serialization_alias="rewriteTaskId")
    status: str
    diff_blocks: list[DiffBlockOut] = Field(serialization_alias="diffBlocks")
    materials_checklist: list[str] = Field(
        default_factory=list, serialization_alias="materialsChecklist"
    )
    new_resume_version_id: uuid.UUID | None = Field(
        default=None, serialization_alias="newResumeVersionId"
    )


class RewriteConfirm(BaseModel):
    edited_content: str = Field(alias="editedContent", min_length=1)
    version_summary: str | None = Field(default=None, alias="versionSummary")

    model_config = ConfigDict(populate_by_name=True)


class RewriteConfirmOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    new_resume_version_id: uuid.UUID = Field(serialization_alias="newResumeVersionId")
    status: str
