"""Integration tests for report export (Markdown / JSON)."""

from __future__ import annotations

import json

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


async def _create_report(client: AsyncClient, headers: dict) -> str:
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
    job_id = job.json()["data"]["id"]
    match = await client.post(
        "/api/v1/matches",
        headers=headers,
        json={"resumeVersionId": resume_version_id, "jobId": job_id},
    )
    return match.json()["data"]["reportId"]


async def test_export_markdown(client: AsyncClient, auth_headers: dict) -> None:
    report_id = await _create_report(client, auth_headers)
    resp = await client.get(
        f"/api/v1/reports/{report_id}/export", headers=auth_headers, params={"format": "md"}
    )
    assert resp.status_code == 200, resp.text
    assert resp.headers["content-type"].startswith("text/markdown")
    assert "attachment" in resp.headers["content-disposition"]
    body = resp.text
    assert "# 匹配报告" in body
    assert "数据分析实习生" in body
    assert "维度评分" in body


async def test_export_json(client: AsyncClient, auth_headers: dict) -> None:
    report_id = await _create_report(client, auth_headers)
    resp = await client.get(
        f"/api/v1/reports/{report_id}/export", headers=auth_headers, params={"format": "json"}
    )
    assert resp.status_code == 200, resp.text
    assert resp.headers["content-type"].startswith("application/json")
    payload = json.loads(resp.text)
    # Exported JSON is the raw report detail (not wrapped in the envelope).
    assert payload["id"] == report_id
    assert payload["overallScore"] >= 0
    assert payload["job"]["title"] == "数据分析实习生"


async def test_export_invalid_format_rejected(client: AsyncClient, auth_headers: dict) -> None:
    report_id = await _create_report(client, auth_headers)
    resp = await client.get(
        f"/api/v1/reports/{report_id}/export", headers=auth_headers, params={"format": "pdf"}
    )
    assert resp.status_code == 422


async def test_export_other_users_report_404(
    client: AsyncClient, auth_headers: dict, second_auth_headers: dict
) -> None:
    report_id = await _create_report(client, auth_headers)
    resp = await client.get(
        f"/api/v1/reports/{report_id}/export",
        headers=second_auth_headers,
        params={"format": "md"},
    )
    assert resp.status_code == 404
