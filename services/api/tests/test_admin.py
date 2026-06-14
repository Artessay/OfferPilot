"""Integration tests for the admin module (FR16)."""

from __future__ import annotations

from httpx import AsyncClient

JD_TEXT = (
    "岗位职责：负责公共岗位库示例数据的维护与展示，支持学生浏览；"
    "任职要求：熟悉岗位信息结构，具备基础数据管理能力。"
)


async def test_non_admin_forbidden(client: AsyncClient, auth_headers: dict) -> None:
    resp = await client.get("/api/v1/admin/prompts", headers=auth_headers)
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "PERMISSION_DENIED"


async def test_admin_unauthenticated(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/admin/prompts")
    assert resp.status_code == 401


async def test_prompt_crud_and_activation(
    client: AsyncClient, admin_auth_headers: dict
) -> None:
    # Create v1 (active).
    v1 = await client.post(
        "/api/v1/admin/prompts",
        headers=admin_auth_headers,
        json={
            "name": "resume_parse",
            "version": "v1",
            "content": "解析简历为结构化 JSON。",
            "isActive": True,
        },
    )
    assert v1.status_code == 201, v1.text
    assert v1.json()["data"]["isActive"] is True

    # Create v2 (active) -> v1 should be deactivated.
    v2 = await client.post(
        "/api/v1/admin/prompts",
        headers=admin_auth_headers,
        json={
            "name": "resume_parse",
            "version": "v2",
            "content": "更详细的解析。",
            "isActive": True,
        },
    )
    v2_id = v2.json()["data"]["id"]

    listing = await client.get("/api/v1/admin/prompts", headers=admin_auth_headers)
    by_version = {p["version"]: p for p in listing.json()["data"]}
    assert by_version["v1"]["isActive"] is False
    assert by_version["v2"]["isActive"] is True

    # Re-activate v1.
    v1_id = by_version["v1"]["id"]
    activated = await client.post(
        f"/api/v1/admin/prompts/{v1_id}/activate", headers=admin_auth_headers
    )
    assert activated.json()["data"]["isActive"] is True

    listing2 = await client.get("/api/v1/admin/prompts", headers=admin_auth_headers)
    by_version2 = {p["version"]: p for p in listing2.json()["data"]}
    assert by_version2["v1"]["isActive"] is True
    assert by_version2["v2"]["isActive"] is False

    # Delete v2.
    deleted = await client.delete(
        f"/api/v1/admin/prompts/{v2_id}", headers=admin_auth_headers
    )
    assert deleted.status_code == 204


async def test_scoring_rule_crud(client: AsyncClient, admin_auth_headers: dict) -> None:
    created = await client.post(
        "/api/v1/admin/scoring-rules",
        headers=admin_auth_headers,
        json={
            "name": "default",
            "version": "v1",
            "weights": {"hard_skill": 0.3, "experience": 0.3},
            "isActive": True,
        },
    )
    assert created.status_code == 201, created.text
    rule_id = created.json()["data"]["id"]

    updated = await client.patch(
        f"/api/v1/admin/scoring-rules/{rule_id}",
        headers=admin_auth_headers,
        json={"weights": {"hard_skill": 0.5}},
    )
    assert updated.json()["data"]["weights"] == {"hard_skill": 0.5}


async def test_public_job_library(client: AsyncClient, admin_auth_headers: dict) -> None:
    created = await client.post(
        "/api/v1/admin/jobs",
        headers=admin_auth_headers,
        json={"title": "公共示例岗位", "company": "示例", "city": "上海", "jdText": JD_TEXT},
    )
    assert created.status_code == 201, created.text
    job_id = created.json()["data"]["id"]

    listing = await client.get("/api/v1/admin/jobs", headers=admin_auth_headers)
    assert listing.json()["data"]["meta"]["total"] == 1

    deleted = await client.delete(
        f"/api/v1/admin/jobs/{job_id}", headers=admin_auth_headers
    )
    assert deleted.status_code == 204


async def test_public_job_visible_to_students(
    client: AsyncClient, admin_auth_headers: dict, auth_headers: dict
) -> None:
    await client.post(
        "/api/v1/admin/jobs",
        headers=admin_auth_headers,
        json={"title": "公共可见岗位", "jdText": JD_TEXT},
    )
    # A normal student should see the public job in their job list.
    listing = await client.get("/api/v1/jobs", headers=auth_headers)
    titles = [j["title"] for j in listing.json()["data"]["items"]]
    assert "公共可见岗位" in titles


async def test_user_listing(client: AsyncClient, admin_auth_headers: dict) -> None:
    resp = await client.get("/api/v1/admin/users", headers=admin_auth_headers)
    assert resp.status_code == 200
    # At least the admin user itself.
    assert resp.json()["data"]["meta"]["total"] >= 1
