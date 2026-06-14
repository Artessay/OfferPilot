"""Profile request/response schemas."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ProfileUpdate(BaseModel):
    education_level: str | None = Field(default=None, alias="educationLevel", max_length=32)
    school: str | None = Field(default=None, max_length=128)
    major: str | None = Field(default=None, max_length=128)
    graduation_year: int | None = Field(default=None, alias="graduationYear", ge=1950, le=2100)
    target_roles: list[str] = Field(default_factory=list, alias="targetRoles")
    target_cities: list[str] = Field(default_factory=list, alias="targetCities")
    industries: list[str] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    career_interests: list[str] = Field(default_factory=list, alias="careerInterests")

    model_config = ConfigDict(populate_by_name=True)


class ProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: uuid.UUID
    education_level: str | None = Field(default=None, serialization_alias="educationLevel")
    school: str | None = None
    major: str | None = None
    graduation_year: int | None = Field(default=None, serialization_alias="graduationYear")
    target_roles: list[str] = Field(serialization_alias="targetRoles")
    target_cities: list[str] = Field(serialization_alias="targetCities")
    industries: list[str]
    skills: list[str]
    career_interests: list[str] = Field(serialization_alias="careerInterests")
    updated_at: datetime = Field(serialization_alias="updatedAt")


class SkillSuggestions(BaseModel):
    skills: list[str]
