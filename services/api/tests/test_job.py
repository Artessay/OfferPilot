"""Integration tests for the job module (create, parse, search, update, delete)."""

from __future__ import annotations

from httpx import AsyncClient

JD_TEXT = (
    "岗位职责\n负责用户行为数据分析，输出数据报告，支持业务决策。\n"
    "任职要求\n熟练使用 SQL 和 Python 进行数据分析；具备良好的沟通能力。\n"
    "加分项\n有 A/B 实验经验者优先。\n"
)


async def _create(client: AsyncClient, headers: dict) -> dict:
    resp = await client.post(
        "/api/v1/jobs",
        headers=headers,
        json={
            "title": "数据分析实习生",
            "company": "示例科技",
            "city": "上海",
            "sourceType": "manual",
            "jdText": JD_TEXT,
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["data"]


async def test_create_job_parses_jd(client: AsyncClient, auth_headers: dict) -> None:
    data = await _create(client, auth_headers)
    assert data["status"] == "parsed"
    assert data["analysis"] is not None
    assert "SQL" in data["analysis"]["hardSkills"]
    assert data["analysis"]["requirements"]
    assert data["analysis"]["bonusPoints"]


async def test_reject_short_jd(client: AsyncClient, auth_headers: dict) -> None:
    resp = await client.post(
        "/api/v1/jobs",
        headers=auth_headers,
        json={"title": "x", "jdText": "太短"},
    )
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "JD_TEXT_TOO_SHORT"


async def test_search_jobs(client: AsyncClient, auth_headers: dict) -> None:
    await _create(client, auth_headers)
    resp = await client.get("/api/v1/jobs", headers=auth_headers, params={"keyword": "数据分析"})
    assert resp.status_code == 200
    assert resp.json()["data"]["meta"]["total"] == 1


async def test_update_job_reparses_on_jd_change(client: AsyncClient, auth_headers: dict) -> None:
    created = await _create(client, auth_headers)
    resp = await client.put(
        f"/api/v1/jobs/{created['id']}",
        headers=auth_headers,
        json={"jdText": JD_TEXT + "\n需要熟悉 Tableau 数据可视化。"},
    )
    assert resp.status_code == 200
    analysis = await client.get(f"/api/v1/jobs/{created['id']}/analysis", headers=auth_headers)
    assert "Tableau" in analysis.json()["data"]["hardSkills"]


async def test_delete_job(client: AsyncClient, auth_headers: dict) -> None:
    created = await _create(client, auth_headers)
    resp = await client.delete(f"/api/v1/jobs/{created['id']}", headers=auth_headers)
    assert resp.status_code == 204
    missing = await client.get(f"/api/v1/jobs/{created['id']}", headers=auth_headers)
    assert missing.status_code == 404
