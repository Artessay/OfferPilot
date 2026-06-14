"""Integration tests for the profile module."""

from __future__ import annotations

from httpx import AsyncClient


async def test_get_profile_autocreates(client: AsyncClient, auth_headers: dict) -> None:
    resp = await client.get("/api/v1/profile", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["targetRoles"] == []
    assert data["skills"] == []


async def test_update_profile(client: AsyncClient, auth_headers: dict) -> None:
    resp = await client.put(
        "/api/v1/profile",
        headers=auth_headers,
        json={
            "educationLevel": "本科",
            "graduationYear": 2026,
            "targetRoles": ["数据分析师"],
            "targetCities": ["上海"],
            "skills": ["SQL", "Python"],
        },
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["educationLevel"] == "本科"
    assert data["targetRoles"] == ["数据分析师"]
    assert data["skills"] == ["SQL", "Python"]


async def test_skill_suggestions(client: AsyncClient, auth_headers: dict) -> None:
    await client.put(
        "/api/v1/profile",
        headers=auth_headers,
        json={"targetRoles": ["数据分析实习生"]},
    )
    resp = await client.get("/api/v1/profile/skills", headers=auth_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json()["data"]["skills"], list)
    assert resp.json()["data"]["skills"]


async def test_profile_requires_auth(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/profile")
    assert resp.status_code == 401
