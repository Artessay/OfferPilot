"""Tests for the auth module: register, login, guest, refresh, /users/me, RBAC."""

from __future__ import annotations

from httpx import AsyncClient


async def _register(client: AsyncClient, email: str = "stu@example.com") -> dict:
    resp = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "pa55word!", "nickname": "小明"},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["data"]


async def test_register_returns_user_and_tokens(client: AsyncClient) -> None:
    data = await _register(client)
    assert data["user"]["email"] == "stu@example.com"
    assert data["user"]["role"] == "student"
    assert data["user"]["accountType"] == "registered"
    assert data["tokens"]["accessToken"]
    assert data["tokens"]["refreshToken"]


async def test_register_duplicate_email_conflicts(client: AsyncClient) -> None:
    await _register(client)
    resp = await client.post(
        "/api/v1/auth/register",
        json={"email": "stu@example.com", "password": "pa55word!"},
    )
    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "CONFLICT"


async def test_register_rejects_short_password(client: AsyncClient) -> None:
    resp = await client.post(
        "/api/v1/auth/register",
        json={"email": "x@example.com", "password": "short"},
    )
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "VALIDATION_ERROR"


async def test_login_success_and_wrong_password(client: AsyncClient) -> None:
    await _register(client)
    ok = await client.post(
        "/api/v1/auth/login",
        json={"email": "stu@example.com", "password": "pa55word!"},
    )
    assert ok.status_code == 200
    assert ok.json()["data"]["tokens"]["accessToken"]

    bad = await client.post(
        "/api/v1/auth/login",
        json={"email": "stu@example.com", "password": "wrongpass"},
    )
    assert bad.status_code == 401
    assert bad.json()["error"]["code"] == "AUTH_REQUIRED"


async def test_guest_session_creates_guest_user(client: AsyncClient) -> None:
    resp = await client.post("/api/v1/auth/guest", json={"deviceId": "device-abc123"})
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["user"]["accountType"] == "guest"
    assert data["user"]["email"] is None


async def test_me_requires_auth(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/users/me")
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "AUTH_REQUIRED"


async def test_me_returns_current_user(client: AsyncClient) -> None:
    data = await _register(client)
    token = data["tokens"]["accessToken"]
    resp = await client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["data"]["email"] == "stu@example.com"


async def test_refresh_returns_new_tokens(client: AsyncClient) -> None:
    data = await _register(client)
    refresh = data["tokens"]["refreshToken"]
    resp = await client.post("/api/v1/auth/refresh", json={"refreshToken": refresh})
    assert resp.status_code == 200
    assert resp.json()["data"]["accessToken"]


async def test_access_token_rejected_as_refresh(client: AsyncClient) -> None:
    data = await _register(client)
    access = data["tokens"]["accessToken"]
    resp = await client.post("/api/v1/auth/refresh", json={"refreshToken": access})
    assert resp.status_code == 401
