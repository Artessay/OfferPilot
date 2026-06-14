"""Integration tests for job discovery + tiered recommendation (V1.1)."""

from __future__ import annotations

from httpx import AsyncClient

RESUME_BYTES = (
    "实习经历\n数据分析实习 使用 SQL 和 Python 完成用户留存分析\n"
    "技能\nSQL Python 数据分析 沟通能力\n"
).encode()

JD_DATA = (
    "岗位职责\n负责用户行为数据分析，输出数据报告。\n"
    "任职要求\n熟练使用 SQL 和 Python 进行数据分析。\n"
)
JD_MARKETING = "岗位职责\n负责品牌内容策划与公众号运营。\n任职要求\n具备文案撰写与活动策划经验。\n"


async def _seed(client: AsyncClient, headers: dict) -> str:
    resume = await client.post(
        "/api/v1/resumes",
        headers=headers,
        files={"file": ("resume.txt", RESUME_BYTES, "text/plain")},
        data={"title": "我的简历", "isDefault": "true"},
    )
    await client.post(
        "/api/v1/profile",
        headers=headers,
    )
    await client.put(
        "/api/v1/profile",
        headers=headers,
        json={"targetRoles": ["数据分析"], "targetCities": ["上海"]},
    )
    for title, jd, city in [
        ("数据分析实习生", JD_DATA, "上海"),
        ("数据分析师", JD_DATA, "上海"),
        ("品牌运营实习生", JD_MARKETING, "上海"),
    ]:
        await client.post(
            "/api/v1/jobs",
            headers=headers,
            json={"title": title, "city": city, "jdText": jd},
        )
    return resume.json()["data"]["latestVersion"]["id"]


async def test_list_sources_has_default(client: AsyncClient, auth_headers: dict) -> None:
    resp = await client.get("/api/v1/job-sources", headers=auth_headers)
    assert resp.status_code == 200
    sources = resp.json()["data"]
    assert any(s["authStatus"] == "authorized" for s in sources)


async def test_discovery_and_tiered_recommendation(client: AsyncClient, auth_headers: dict) -> None:
    resume_version_id = await _seed(client, auth_headers)

    discovery = await client.post(
        "/api/v1/job-discovery/tasks",
        headers=auth_headers,
        json={
            "resumeVersionId": resume_version_id,
            "filters": {"targetRoles": ["数据分析"], "cities": ["上海"], "maxCandidates": 10},
        },
    )
    assert discovery.status_code == 201, discovery.text
    task = discovery.json()["data"]
    assert task["status"] == "succeeded"
    assert task["candidateCount"] >= 2
    task_id = task["discoveryTaskId"]

    candidates = await client.get(
        f"/api/v1/job-discovery/tasks/{task_id}/candidates", headers=auth_headers
    )
    assert candidates.status_code == 200
    assert len(candidates.json()["data"]) >= 2

    rec = await client.post(
        "/api/v1/recommendations/tiered",
        headers=auth_headers,
        json={
            "discoveryTaskId": task_id,
            "resumeVersionId": resume_version_id,
            "strategy": "balanced",
        },
    )
    assert rec.status_code == 201, rec.text
    data = rec.json()["data"]
    assert {t["tier"] for t in data["tiers"]} == {"priority", "exploratory", "baseline"}
    all_items = [item for tier in data["tiers"] for item in tier["items"]]
    assert all_items
    for item in all_items:
        assert 0.0 <= item["successProbability"] <= 1.0
        assert item["riskLevel"] in {"low", "medium", "high"}
        assert item["tierReason"]


async def test_discovery_rejects_unauthorized_source(
    client: AsyncClient, auth_headers: dict
) -> None:
    resume_version_id = await _seed(client, auth_headers)
    resp = await client.post(
        "/api/v1/job-discovery/tasks",
        headers=auth_headers,
        json={
            "resumeVersionId": resume_version_id,
            "sourceIds": ["00000000-0000-0000-0000-000000000000"],
            "filters": {"targetRoles": ["数据分析"]},
        },
    )
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "JOB_SOURCE_UNAUTHORIZED"


async def test_authorize_source(client: AsyncClient, auth_headers: dict) -> None:
    resp = await client.post(
        "/api/v1/job-sources/authorize",
        headers=auth_headers,
        json={"sourceType": "school", "sourceName": "某校就业网", "scope": {"city": "上海"}},
    )
    assert resp.status_code == 201
    assert resp.json()["data"]["authStatus"] == "authorized"
