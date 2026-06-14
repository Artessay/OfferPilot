"""Tests for AI resume rewrite: fact-consistency unit + integration flow."""

from __future__ import annotations

from app.ai.rewrite import build_rewrite_drafts, check_fact_consistency
from httpx import AsyncClient

ORIGINAL = (
    "实习经历\n某公司 数据分析实习 使用 SQL 和 Python 完成用户留存分析，提升留存 8%\n"
    "技能\nSQL Python 数据分析\n"
)


def test_consistency_passes_for_existing_facts() -> None:
    rewritten = "使用 SQL 和 Python 完成用户留存分析，提升留存 8%"
    assert check_fact_consistency(ORIGINAL, rewritten) == []


def test_consistency_flags_fabricated_skill() -> None:
    rewritten = "使用 SQL、Python 和 机器学习 完成项目"
    violations = check_fact_consistency(ORIGINAL, rewritten)
    assert any("机器学习" in v for v in violations)


def test_consistency_flags_fabricated_number() -> None:
    rewritten = "使用 SQL 完成分析，提升留存 30%"
    violations = check_fact_consistency(ORIGINAL, rewritten)
    assert any("30%" in v for v in violations)


def test_build_drafts_skips_non_rewritable() -> None:
    suggestions = [
        {"category": "risk", "rewritable": False, "suggestion": "补充机器学习项目经历"},
        {"category": "keyword", "rewritable": True, "reason": "突出 SQL"},
    ]
    blocks, materials = build_rewrite_drafts(
        original_resume_text=ORIGINAL,
        resume_skill_tags=["SQL", "Python"],
        accepted_suggestions=suggestions,
        job_hard_skills=["SQL", "Python"],
    )
    assert materials  # non-rewritable surfaced as checklist
    for block in blocks:
        assert check_fact_consistency(ORIGINAL, block.rewritten) == []


# --- Integration: report -> rewrite -> confirm -> new version ---------------

RESUME_BYTES = ORIGINAL.encode()
JD_TEXT = (
    "岗位职责\n负责用户行为数据分析，输出数据报告。\n"
    "任职要求\n熟练使用 SQL 和 Python 进行数据分析。\n"
)


async def _make_report(client: AsyncClient, headers: dict) -> tuple[str, str]:
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
        json={"title": "数据分析实习生", "city": "上海", "jdText": JD_TEXT},
    )
    match = await client.post(
        "/api/v1/matches",
        headers=headers,
        json={"resumeVersionId": resume_version_id, "jobId": job.json()["data"]["id"]},
    )
    return resume_version_id, match.json()["data"]["reportId"]


async def test_rewrite_flow_and_confirm(client: AsyncClient, auth_headers: dict) -> None:
    resume_version_id, report_id = await _make_report(client, auth_headers)

    rewrite = await client.post(
        "/api/v1/resume-rewrites",
        headers=auth_headers,
        json={"resumeVersionId": resume_version_id, "reportId": report_id},
    )
    assert rewrite.status_code == 201, rewrite.text
    task = rewrite.json()["data"]
    assert task["status"] == "drafted"
    task_id = task["rewriteTaskId"]

    confirm = await client.post(
        f"/api/v1/resume-rewrites/{task_id}/confirm",
        headers=auth_headers,
        json={
            "editedContent": "使用 SQL 和 Python 完成用户留存分析，提升留存 8%。",
            "versionSummary": "对齐数据分析岗位优化表达",
        },
    )
    assert confirm.status_code == 200, confirm.text
    assert confirm.json()["data"]["newResumeVersionId"]
    assert confirm.json()["data"]["status"] == "confirmed"


async def test_confirm_rejects_fabricated_content(client: AsyncClient, auth_headers: dict) -> None:
    resume_version_id, report_id = await _make_report(client, auth_headers)
    rewrite = await client.post(
        "/api/v1/resume-rewrites",
        headers=auth_headers,
        json={"resumeVersionId": resume_version_id, "reportId": report_id},
    )
    task_id = rewrite.json()["data"]["rewriteTaskId"]

    resp = await client.post(
        f"/api/v1/resume-rewrites/{task_id}/confirm",
        headers=auth_headers,
        json={"editedContent": "精通 机器学习 与 深度学习，提升准确率 99%。"},
    )
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "RESUME_REWRITE_FAILED"
