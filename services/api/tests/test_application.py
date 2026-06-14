"""Integration tests for the application-tracking module (FR15)."""

from __future__ import annotations

from httpx import AsyncClient

JD_TEXT = (
    "岗位职责\n负责用户行为数据分析，输出数据报告，支持业务决策。\n"
    "任职要求\n熟练使用 SQL 和 Python 进行数据分析；具备良好的沟通能力。\n"
    "加分项\n有 A/B 实验经验者优先。\n"
)


async def _create_job(client: AsyncClient, headers: dict) -> dict:
    resp = await client.post(
        "/api/v1/jobs",
        headers=headers,
        json={
            "title": "数据分析实习生",
            "company": "示例科技",
            "city": "上海",
            "jdText": JD_TEXT,
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["data"]


async def test_create_application(client: AsyncClient, auth_headers: dict) -> None:
    job = await _create_job(client, auth_headers)
    resp = await client.post(
        "/api/v1/applications",
        headers=auth_headers,
        json={"jobId": job["id"], "note": "投递备注"},
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()["data"]
    assert data["status"] == "interested"
    assert data["job"]["title"] == "数据分析实习生"
    assert data["appliedAt"] is None


async def test_duplicate_application_conflicts(client: AsyncClient, auth_headers: dict) -> None:
    job = await _create_job(client, auth_headers)
    first = await client.post(
        "/api/v1/applications", headers=auth_headers, json={"jobId": job["id"]}
    )
    assert first.status_code == 201
    again = await client.post(
        "/api/v1/applications", headers=auth_headers, json={"jobId": job["id"]}
    )
    assert again.status_code == 409
    assert again.json()["error"]["code"] == "CONFLICT"


async def test_status_transition_stamps_applied_at(client: AsyncClient, auth_headers: dict) -> None:
    job = await _create_job(client, auth_headers)
    created = await client.post(
        "/api/v1/applications", headers=auth_headers, json={"jobId": job["id"]}
    )
    record_id = created.json()["data"]["id"]

    resp = await client.patch(
        f"/api/v1/applications/{record_id}",
        headers=auth_headers,
        json={"status": "applied"},
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["status"] == "applied"
    assert data["appliedAt"] is not None


async def test_invalid_status_rejected(client: AsyncClient, auth_headers: dict) -> None:
    job = await _create_job(client, auth_headers)
    created = await client.post(
        "/api/v1/applications", headers=auth_headers, json={"jobId": job["id"]}
    )
    record_id = created.json()["data"]["id"]
    resp = await client.patch(
        f"/api/v1/applications/{record_id}",
        headers=auth_headers,
        json={"status": "not_a_status"},
    )
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "VALIDATION_ERROR"


async def test_list_and_filter_by_status(client: AsyncClient, auth_headers: dict) -> None:
    job = await _create_job(client, auth_headers)
    created = await client.post(
        "/api/v1/applications", headers=auth_headers, json={"jobId": job["id"]}
    )
    record_id = created.json()["data"]["id"]
    await client.patch(
        f"/api/v1/applications/{record_id}",
        headers=auth_headers,
        json={"status": "interview"},
    )

    all_resp = await client.get("/api/v1/applications", headers=auth_headers)
    assert all_resp.json()["data"]["meta"]["total"] == 1

    filtered = await client.get(
        "/api/v1/applications", headers=auth_headers, params={"status": "interview"}
    )
    assert filtered.json()["data"]["meta"]["total"] == 1

    empty = await client.get(
        "/api/v1/applications", headers=auth_headers, params={"status": "offer"}
    )
    assert empty.json()["data"]["meta"]["total"] == 0


async def test_delete_application(client: AsyncClient, auth_headers: dict) -> None:
    job = await _create_job(client, auth_headers)
    created = await client.post(
        "/api/v1/applications", headers=auth_headers, json={"jobId": job["id"]}
    )
    record_id = created.json()["data"]["id"]
    resp = await client.delete(f"/api/v1/applications/{record_id}", headers=auth_headers)
    assert resp.status_code == 204
    missing = await client.get(f"/api/v1/applications/{record_id}", headers=auth_headers)
    assert missing.status_code == 404


async def test_application_requires_existing_job(client: AsyncClient, auth_headers: dict) -> None:
    import uuid

    resp = await client.post(
        "/api/v1/applications",
        headers=auth_headers,
        json={"jobId": str(uuid.uuid4())},
    )
    assert resp.status_code == 404
