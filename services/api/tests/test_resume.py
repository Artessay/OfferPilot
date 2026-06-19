"""Integration tests for the resume module (upload, parse, versions, delete)."""

from __future__ import annotations

from httpx import AsyncClient

RESUME_BYTES = (
    "教育背景\n某大学 统计学 本科 2026 届\n\n"
    "实习经历\n某公司 数据分析实习 使用 SQL 和 Python 完成用户留存分析\n\n"
    "技能\nSQL Python Excel 数据分析 沟通能力\n"
).encode()


async def _upload(client: AsyncClient, headers: dict, *, is_default: bool = False) -> dict:
    resp = await client.post(
        "/api/v1/resumes",
        headers=headers,
        files={"file": ("resume.txt", RESUME_BYTES, "text/plain")},
        data={"title": "我的简历", "isDefault": str(is_default).lower()},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["data"]


async def test_upload_parses_resume(client: AsyncClient, auth_headers: dict) -> None:
    data = await _upload(client, auth_headers)
    assert data["status"] == "parsed"
    assert data["title"] == "我的简历"
    version = data["latestVersion"]
    assert version is not None
    assert "SQL" in version["skillTags"]
    assert "Python" in version["skillTags"]


async def test_reject_unsupported_file_type(client: AsyncClient, auth_headers: dict) -> None:
    resp = await client.post(
        "/api/v1/resumes",
        headers=auth_headers,
        files={"file": ("malware.exe", b"MZ...", "application/octet-stream")},
    )
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "RESUME_FILE_INVALID"


async def test_list_and_get_resume(client: AsyncClient, auth_headers: dict) -> None:
    created = await _upload(client, auth_headers)
    listing = await client.get("/api/v1/resumes", headers=auth_headers)
    assert listing.status_code == 200
    assert listing.json()["data"]["meta"]["total"] == 1

    detail = await client.get(f"/api/v1/resumes/{created['id']}", headers=auth_headers)
    assert detail.status_code == 200
    assert detail.json()["data"]["id"] == created["id"]


async def test_analysis_endpoint(client: AsyncClient, auth_headers: dict) -> None:
    created = await _upload(client, auth_headers)
    resp = await client.get(f"/api/v1/resumes/{created['id']}/analysis", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["data"]["versionNo"] == 1


async def test_create_manual_version(client: AsyncClient, auth_headers: dict) -> None:
    created = await _upload(client, auth_headers)
    resp = await client.post(
        f"/api/v1/resumes/{created['id']}/versions",
        headers=auth_headers,
        json={"content": "新版本简历文本，包含 Python 与 数据分析 项目经历。"},
    )
    assert resp.status_code == 201
    assert resp.json()["data"]["versionNo"] == 2


async def test_set_default_and_delete(client: AsyncClient, auth_headers: dict) -> None:
    a = await _upload(client, auth_headers, is_default=True)
    b = await _upload(client, auth_headers)

    resp = await client.post(f"/api/v1/resumes/{b['id']}/default", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["data"]["isDefault"] is True

    delete = await client.delete(f"/api/v1/resumes/{a['id']}", headers=auth_headers)
    assert delete.status_code == 204
    missing = await client.get(f"/api/v1/resumes/{a['id']}", headers=auth_headers)
    assert missing.status_code == 404


async def test_cannot_access_others_resume(client: AsyncClient, auth_headers: dict) -> None:
    created = await _upload(client, auth_headers)
    other = await client.post(
        "/api/v1/auth/register",
        json={"email": "other@example.com", "password": "pa55word!"},
    )
    other_token = other.json()["data"]["tokens"]["accessToken"]
    resp = await client.get(
        f"/api/v1/resumes/{created['id']}",
        headers={"Authorization": f"Bearer {other_token}"},
    )
    assert resp.status_code == 404


async def test_download_original_file(client: AsyncClient, auth_headers: dict) -> None:
    created = await _upload(client, auth_headers)
    resp = await client.get(f"/api/v1/resumes/{created['id']}/download", headers=auth_headers)
    assert resp.status_code == 200, resp.text
    assert resp.content == RESUME_BYTES
    assert "attachment" in resp.headers["content-disposition"]


async def test_update_analysis_persists_edits(client: AsyncClient, auth_headers: dict) -> None:
    created = await _upload(client, auth_headers)
    resp = await client.patch(
        f"/api/v1/resumes/{created['id']}/analysis",
        headers=auth_headers,
        json={
            "skillTags": ["Python", "SQL", "数据分析"],
            "structuredData": {
                "experiences": ["负责用户留存分析"],
                "projects": ["A/B 测试平台"],
                "education": ["某大学 统计学 本科"],
                "awards": [],
            },
        },
    )
    assert resp.status_code == 200, resp.text
    version = resp.json()["data"]["latestVersion"]
    assert version["skillTags"] == ["Python", "SQL", "数据分析"]
    assert version["structuredData"]["experiences"] == ["负责用户留存分析"]

    # The edit is persisted and stays on the same version number (in place).
    analysis = await client.get(f"/api/v1/resumes/{created['id']}/analysis", headers=auth_headers)
    assert analysis.json()["data"]["skillTags"] == ["Python", "SQL", "数据分析"]
    assert analysis.json()["data"]["versionNo"] == 1


async def test_update_analysis_rejects_others_resume(
    client: AsyncClient, auth_headers: dict
) -> None:
    created = await _upload(client, auth_headers)
    other = await client.post(
        "/api/v1/auth/register",
        json={"email": "editor@example.com", "password": "pa55word!"},
    )
    other_token = other.json()["data"]["tokens"]["accessToken"]
    resp = await client.patch(
        f"/api/v1/resumes/{created['id']}/analysis",
        headers={"Authorization": f"Bearer {other_token}"},
        json={"skillTags": ["X"]},
    )
    assert resp.status_code == 404
