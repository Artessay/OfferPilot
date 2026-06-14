"""Auth request/response schemas."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    nickname: str | None = Field(default=None, max_length=64)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class GuestRequest(BaseModel):
    device_id: str | None = Field(default=None, max_length=128, alias="deviceId")

    model_config = ConfigDict(populate_by_name=True)


class RefreshRequest(BaseModel):
    refresh_token: str = Field(alias="refreshToken")

    model_config = ConfigDict(populate_by_name=True)


class UserPublic(BaseModel):
    """User fields safe to return to the client."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: uuid.UUID
    email: str | None = None
    nickname: str | None = None
    role: str
    account_type: str = Field(serialization_alias="accountType")
    created_at: datetime = Field(serialization_alias="createdAt")


class TokenPair(BaseModel):
    access_token: str = Field(serialization_alias="accessToken")
    refresh_token: str = Field(serialization_alias="refreshToken")
    token_type: str = Field(default="bearer", serialization_alias="tokenType")


class AuthResult(BaseModel):
    """Login/register/guest result: the user plus a fresh token pair."""

    user: UserPublic
    tokens: TokenPair
