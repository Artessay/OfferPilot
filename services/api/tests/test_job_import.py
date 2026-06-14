"""Integration tests for bulk job import (FR07)."""

from __future__ import annotations

import io

from httpx import AsyncClient

CSV_CONTENT = (
    "title,company,city,jd\n"
    "数据分析实习生,示例科技,上海,"
    "岗位职责：负责用户行为数据分析，输出数据报告，支持业务决策；"
    "任职要求：熟练使用 SQL 与 Python 进行数据分析，具备良好沟通能力。\n"
    "算法工程师,示例 AI,北京,"
    "岗位职责：负责推荐算法的研发与持续优化，落地线上实验；"
    "任职要求：熟悉机器学习与深度学习框架，具备工程落地能力。\n"
    "缺描述岗位,无效公司,广州,\n"
)


async def test_import_csv_creates_jobs_and_reports_errors(
    client: AsyncClient, auth_headers: dict
) -> None:
    files = {"file": ("jobs.csv", io.BytesIO(CSV_CONTENT.encode("utf-8")), "text/csv")}
    resp = await client.post("/api/v1/jobs/import", headers=auth_headers, files=files)
    assert resp.status_code == 201, resp.text
    data = resp.json()["data"]
    assert data["createdCount"] == 2
    assert len(data["items"]) == 2
    # The third row has no JD and must be reported as a skipped row.
    assert len(data["errors"]) == 1

    listed = await client.get("/api/v1/jobs", headers=auth_headers)
    assert listed.json()["data"]["meta"]["total"] == 2


async def test_import_txt_single_job(client: AsyncClient, auth_headers: dict) -> None:
    body = (
        "高级前端工程师\n"
        "岗位职责：负责核心前端架构设计与组件库建设；"
        "任职要求：精通 React 与 TypeScript，有大型项目经验。"
    )
    files = {"file": ("jd.txt", io.BytesIO(body.encode("utf-8")), "text/plain")}
    resp = await client.post("/api/v1/jobs/import", headers=auth_headers, files=files)
    assert resp.status_code == 201, resp.text
    data = resp.json()["data"]
    assert data["createdCount"] == 1
    assert data["items"][0]["title"] == "高级前端工程师"


async def test_import_xlsx_creates_jobs(client: AsyncClient, auth_headers: dict) -> None:
    from openpyxl import Workbook

    wb = Workbook()
    ws = wb.active
    ws.append(["title", "company", "city", "jd"])
    ws.append(
        [
            "产品经理",
            "示例集团",
            "深圳",
            "岗位职责：负责产品规划、需求分析与项目推进，协调研发与设计；任职要求：具备数据驱动的产品决策能力与良好的跨团队沟通能力。",
        ]
    )
    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    files = {
        "file": (
            "jobs.xlsx",
            buffer,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
    }
    resp = await client.post("/api/v1/jobs/import", headers=auth_headers, files=files)
    assert resp.status_code == 201, resp.text
    data = resp.json()["data"]
    assert data["createdCount"] == 1
    assert data["items"][0]["title"] == "产品经理"


async def test_import_unsupported_extension_rejected(
    client: AsyncClient, auth_headers: dict
) -> None:
    files = {"file": ("jobs.pdf", io.BytesIO(b"%PDF-1.4 fake"), "application/pdf")}
    resp = await client.post("/api/v1/jobs/import", headers=auth_headers, files=files)
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "VALIDATION_ERROR"
