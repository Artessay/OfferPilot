"""Integration tests for the match + report MVP closed loop."""

from __future__ import annotations

from httpx import AsyncClient

RESUME_BYTES = (
    "教育背景\n某大学 统计学 本科 2026 届\n\n"
    "实习经历\n某公司 数据分析实习 使用 SQL 和 Python 完成用户留存分析，提升留存 8%\n\n"
    "技能\nSQL Python Excel 数据分析 沟通能力\n"
).encode()

JD_TEXT = (
    "岗位职责\n负责用户行为数据分析，输出数据报告，支持业务决策。\n"
    "任职要求\n熟练使用 SQL 和 Python 进行数据分析；具备良好的沟通能力。\n"
    "加分项\n有 A/B 实验经验者优先。\n"
)


async def _setup(client: AsyncClient, headers: dict) -> tuple[str, str]:
    resume = await client.post(
        "/api/v1/resumes",
        headers=headers,
        files={"file": ("resume.txt", RESUME_BYTES, "text/plain")},
        data={"title": "我的简历"},
    )
    resume_version_id = resume.json()["data"]["latestVersion"]["id"]
    job = await client.post(
        "/api/v1/jobs",
        headers=headers,
        json={"title": "数据分析实习生", "company": "示例科技", "city": "上海", "jdText": JD_TEXT},
    )
    return resume_version_id, job.json()["data"]["id"]


async def test_full_match_report_flow(client: AsyncClient, auth_headers: dict) -> None:
    resume_version_id, job_id = await _setup(client, auth_headers)

    match = await client.post(
        "/api/v1/matches",
        headers=auth_headers,
        json={"resumeVersionId": resume_version_id, "jobId": job_id},
    )
    assert match.status_code == 201, match.text
    body = match.json()["data"]
    assert body["status"] == "succeeded"
    assert body["reportId"] is not None
    report_id = body["reportId"]

    report = await client.get(f"/api/v1/reports/{report_id}", headers=auth_headers)
    assert report.status_code == 200
    data = report.json()["data"]
    assert 0 <= data["overallScore"] <= 100
    assert data["matchLevel"] in {"low", "medium", "high", "excellent"}
    assert len(data["dimensionScores"]) == 6
    assert data["job"]["title"] == "数据分析实习生"
    assert data["suggestions"]


async def test_match_requires_parsed_job(client: AsyncClient, auth_headers: dict) -> None:
    resume = await client.post(
        "/api/v1/resumes",
        headers=auth_headers,
        files={"file": ("resume.txt", RESUME_BYTES, "text/plain")},
    )
    resume_version_id = resume.json()["data"]["latestVersion"]["id"]
    # A random job id that doesn't exist.
    resp = await client.post(
        "/api/v1/matches",
        headers=auth_headers,
        json={
            "resumeVersionId": resume_version_id,
            "jobId": "00000000-0000-0000-0000-000000000000",
        },
    )
    assert resp.status_code == 404


async def test_match_task_status_query(client: AsyncClient, auth_headers: dict) -> None:
    resume_version_id, job_id = await _setup(client, auth_headers)
    match = await client.post(
        "/api/v1/matches",
        headers=auth_headers,
        json={"resumeVersionId": resume_version_id, "jobId": job_id},
    )
    task_id = match.json()["data"]["matchTaskId"]
    status_resp = await client.get(f"/api/v1/matches/{task_id}", headers=auth_headers)
    assert status_resp.status_code == 200
    assert status_resp.json()["data"]["status"] == "succeeded"


async def test_suggestion_status_update(client: AsyncClient, auth_headers: dict) -> None:
    resume_version_id, job_id = await _setup(client, auth_headers)
    match = await client.post(
        "/api/v1/matches",
        headers=auth_headers,
        json={"resumeVersionId": resume_version_id, "jobId": job_id},
    )
    report_id = match.json()["data"]["reportId"]
    report = await client.get(f"/api/v1/reports/{report_id}", headers=auth_headers)
    suggestion_id = report.json()["data"]["suggestions"][0]["id"]

    resp = await client.patch(
        f"/api/v1/suggestions/{suggestion_id}",
        headers=auth_headers,
        json={"status": "accepted"},
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["status"] == "accepted"


async def test_reports_list_and_regenerate(client: AsyncClient, auth_headers: dict) -> None:
    resume_version_id, job_id = await _setup(client, auth_headers)
    match = await client.post(
        "/api/v1/matches",
        headers=auth_headers,
        json={"resumeVersionId": resume_version_id, "jobId": job_id},
    )
    report_id = match.json()["data"]["reportId"]

    listing = await client.get("/api/v1/reports", headers=auth_headers)
    assert listing.json()["data"]["meta"]["total"] == 1

    regen = await client.post(
        f"/api/v1/reports/{report_id}/suggestions/regenerate", headers=auth_headers
    )
    assert regen.status_code == 200
    assert isinstance(regen.json()["data"], list)
