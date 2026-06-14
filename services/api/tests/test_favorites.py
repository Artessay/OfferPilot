"""Integration tests for job favorites (V1.1) and resume version listing."""

from __future__ import annotations

from httpx import AsyncClient

JD_TEXT = (
    "岗位职责：负责用户行为数据分析，输出数据报告，支持业务决策；"
    "任职要求：熟练使用 SQL 与 Python 进行数据分析，具备良好沟通能力。"
)

RESUME_BYTES = (
    "教育背景\n某大学 统计学 本科 2026 届\n\n技能\nSQL Python Excel 数据分析\n"
).encode()


async def _create_job(client: AsyncClient, headers: dict) -> str:
    resp = await client.post(
        "/api/v1/jobs",
        headers=headers,
        json={"title": "数据分析实习生", "company": "示例科技", "city": "上海", "jdText": JD_TEXT},
    )
    return resp.json()["data"]["id"]


async def test_favorite_and_unfavorite(client: AsyncClient, auth_headers: dict) -> None:
    job_id = await _create_job(client, auth_headers)

    add = await client.post(f"/api/v1/jobs/{job_id}/favorite", headers=auth_headers)
    assert add.status_code == 204

    favorites = await client.get("/api/v1/jobs/favorites", headers=auth_headers)
    assert favorites.json()["data"]["meta"]["total"] == 1

    detail = await client.get(f"/api/v1/jobs/{job_id}", headers=auth_headers)
    assert detail.json()["data"]["isFavorite"] is True

    remove = await client.delete(f"/api/v1/jobs/{job_id}/favorite", headers=auth_headers)
    assert remove.status_code == 204

    favorites2 = await client.get("/api/v1/jobs/favorites", headers=auth_headers)
    assert favorites2.json()["data"]["meta"]["total"] == 0


async def test_favorite_is_idempotent(client: AsyncClient, auth_headers: dict) -> None:
    job_id = await _create_job(client, auth_headers)
    await client.post(f"/api/v1/jobs/{job_id}/favorite", headers=auth_headers)
    await client.post(f"/api/v1/jobs/{job_id}/favorite", headers=auth_headers)
    favorites = await client.get("/api/v1/jobs/favorites", headers=auth_headers)
    assert favorites.json()["data"]["meta"]["total"] == 1


async def test_favorite_missing_job_404(client: AsyncClient, auth_headers: dict) -> None:
    import uuid

    resp = await client.post(f"/api/v1/jobs/{uuid.uuid4()}/favorite", headers=auth_headers)
    assert resp.status_code == 404


async def test_list_resume_versions(client: AsyncClient, auth_headers: dict) -> None:
    upload = await client.post(
        "/api/v1/resumes",
        headers=auth_headers,
        files={"file": ("resume.txt", RESUME_BYTES, "text/plain")},
        data={"title": "我的简历"},
    )
    resume_id = upload.json()["data"]["id"]

    versions = await client.get(f"/api/v1/resumes/{resume_id}/versions", headers=auth_headers)
    assert versions.status_code == 200
    assert len(versions.json()["data"]) >= 1

    # Create a second manual version and confirm it is listed first (desc).
    await client.post(
        f"/api/v1/resumes/{resume_id}/versions",
        headers=auth_headers,
        json={"content": "更新后的简历正文，包含更多量化的项目成果与技能描述。"},
    )
    versions2 = await client.get(f"/api/v1/resumes/{resume_id}/versions", headers=auth_headers)
    data = versions2.json()["data"]
    assert len(data) >= 2
    assert data[0]["versionNo"] > data[1]["versionNo"]
