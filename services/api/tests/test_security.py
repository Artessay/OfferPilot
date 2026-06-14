"""Unit tests for password hashing and JWT helpers."""

from __future__ import annotations

import jwt
import pytest
from app.shared.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)


def test_password_hash_roundtrip() -> None:
    h = hash_password("pa55word!")
    assert h != "pa55word!"
    assert verify_password("pa55word!", h) is True
    assert verify_password("wrong", h) is False


def test_access_token_decodes_with_type() -> None:
    token = create_access_token("user-1", role="student")
    payload = decode_token(token, expected_type="access")
    assert payload["sub"] == "user-1"
    assert payload["role"] == "student"
    assert payload["type"] == "access"


def test_refresh_token_type_enforced() -> None:
    refresh = create_refresh_token("user-1")
    # Decoding a refresh token as access must fail.
    with pytest.raises(jwt.InvalidTokenError):
        decode_token(refresh, expected_type="access")


def test_tampered_token_rejected() -> None:
    token = create_access_token("user-1")
    with pytest.raises(jwt.InvalidTokenError):
        decode_token(token + "tamper", expected_type="access")
