"""Admin request/response schemas (prompts, scoring rules, jobs, users)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


# --- Prompt templates ---
class PromptTemplateCreate(BaseModel):
    name: str = Field(min_length=1, max_length=64)
    version: str = Field(min_length=1, max_length=32)
    content: str = Field(min_length=1)
    schema_version: str | None = Field(default=None, alias="schemaVersion", max_length=32)
    is_active: bool = Field(default=True, alias="isActive")

    model_config = ConfigDict(populate_by_name=True)


class PromptTemplateUpdate(BaseModel):
    content: str | None = Field(default=None, min_length=1)
    schema_version: str | None = Field(default=None, alias="schemaVersion", max_length=32)
    is_active: bool | None = Field(default=None, alias="isActive")

    model_config = ConfigDict(populate_by_name=True)


class PromptTemplateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: uuid.UUID
    name: str
    version: str
    content: str
    schema_version: str | None = Field(default=None, serialization_alias="schemaVersion")
    is_active: bool = Field(serialization_alias="isActive")
    updated_at: datetime = Field(serialization_alias="updatedAt")


# --- Scoring rules ---
class ScoringRuleCreate(BaseModel):
    name: str = Field(min_length=1, max_length=64)
    version: str = Field(min_length=1, max_length=32)
    weights: dict[str, Any] = Field(default_factory=dict)
    is_active: bool = Field(default=True, alias="isActive")

    model_config = ConfigDict(populate_by_name=True)


class ScoringRuleUpdate(BaseModel):
    weights: dict[str, Any] | None = None
    is_active: bool | None = Field(default=None, alias="isActive")

    model_config = ConfigDict(populate_by_name=True)


class ScoringRuleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: uuid.UUID
    name: str
    version: str
    weights: dict[str, Any]
    is_active: bool = Field(serialization_alias="isActive")
    updated_at: datetime = Field(serialization_alias="updatedAt")


# --- Public job library ---
class AdminJobCreate(BaseModel):
    title: str = Field(min_length=1, max_length=128)
    company: str | None = Field(default=None, max_length=128)
    city: str | None = Field(default=None, max_length=64)
    jd_text: str = Field(alias="jdText", min_length=1)

    model_config = ConfigDict(populate_by_name=True)


# --- Users ---
class UserSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: uuid.UUID
    email: str | None = None
    nickname: str | None = None
    role: str
    account_type: str = Field(serialization_alias="accountType")
    created_at: datetime = Field(serialization_alias="createdAt")
