"""Unit tests for the AI foundation: embedding, extraction, provider, storage."""

from __future__ import annotations

import pytest
from app.ai.embedding import cosine_similarity, deterministic_embedding, tokenize
from app.ai.extraction import extract_keywords, parse_jd, parse_resume
from app.ai.providers.fake import FakeProvider
from app.ai.skills import extract_hard_skills, normalize_skill
from app.shared.documents import extract_text, normalize_text, validate_upload
from app.shared.errors import AppError
from app.shared.storage import LocalStorage, build_object_key

RESUME_TEXT = """
教育背景
某大学 统计学 本科 2026 届

实习经历
某互联网公司 数据分析实习 使用 SQL 和 Python 完成用户留存分析

项目经历
用户增长项目 通过数据可视化 Tableau 输出业务洞察

技能
SQL Python Excel 数据分析 沟通能力
"""

JD_TEXT = """
岗位职责
负责用户行为数据分析，输出数据报告，支持业务决策。
任职要求
熟练使用 SQL 和 Python 进行数据分析；具备良好的沟通能力。
加分项
有 A/B 实验经验者优先。
"""


def test_tokenize_handles_mixed_language() -> None:
    tokens = tokenize("使用 SQL 和 Python")
    assert "sql" in tokens
    assert "python" in tokens
    assert "使用" in tokens


def test_embedding_is_deterministic_and_normalised() -> None:
    a = deterministic_embedding("数据分析 SQL Python")
    b = deterministic_embedding("数据分析 SQL Python")
    assert a == b
    assert cosine_similarity(a, b) == pytest.approx(1.0, abs=1e-6)


def test_embedding_similarity_reflects_overlap() -> None:
    base = deterministic_embedding("SQL Python 数据分析")
    near = deterministic_embedding("Python SQL 数据分析 项目")
    far = deterministic_embedding("市场营销 品牌策划 文案")
    assert cosine_similarity(base, near) > cosine_similarity(base, far)


def test_extract_hard_skills_and_normalize() -> None:
    skills = extract_hard_skills("熟悉 python 和 SQL，会用 Tableau")
    assert "Python" in skills
    assert "SQL" in skills
    assert "Tableau" in skills
    assert normalize_skill("py") == "Python"
    assert normalize_skill("不存在技能") is None


def test_parse_resume_extracts_sections_and_skills() -> None:
    parsed = parse_resume(RESUME_TEXT)
    assert "SQL" in parsed["skill_tags"]
    assert "Python" in parsed["skill_tags"]
    assert parsed["structured_data"]["experiences"]
    assert parsed["summary"]


def test_parse_jd_extracts_requirements_and_bonus() -> None:
    parsed = parse_jd(JD_TEXT)
    assert "SQL" in parsed["hard_skills"]
    assert parsed["requirements"]
    assert parsed["bonus_points"]
    assert parsed["seniority_level"] in {"internship", "entry", "senior", "unspecified"}
    assert all("term" in kw and "weight" in kw for kw in parsed["keywords"])


def test_extract_keywords_skips_stopwords() -> None:
    keywords = extract_keywords("数据 数据 分析 的 和 the and")
    assert "数据" in keywords
    assert "的" not in keywords


async def test_fake_provider_embeddings_and_completion() -> None:
    provider = FakeProvider()
    vectors = await provider.embed(["SQL Python", "市场营销"])
    assert len(vectors) == 2
    assert len(vectors[0]) == 256
    result = await provider.complete(system="s", user="u", json_mode=True)
    assert result.content == "{}"
    assert result.model == "fake"


def test_validate_upload_rejects_bad_type_and_size() -> None:
    assert validate_upload("resume.pdf", 1000) == ".pdf"
    with pytest.raises(AppError):
        validate_upload("resume.exe", 1000)
    with pytest.raises(AppError):
        validate_upload("resume.pdf", 100 * 1024 * 1024)


def test_extract_text_from_txt_and_normalize() -> None:
    text = extract_text("note.txt", "第一行\n\n\n第二行   有  空格".encode())
    assert "第一行" in text
    assert "第二行 有 空格" in text
    assert normalize_text("a\r\n\r\n\r\nb") == "a\n\nb"


async def test_local_storage_roundtrip(tmp_path: object) -> None:
    storage = LocalStorage(str(tmp_path))
    key = build_object_key(prefix="resumes/u1", filename="我的简历.pdf")
    await storage.save(key, b"hello")
    assert await storage.exists(key) is True
    assert await storage.get(key) == b"hello"
    await storage.delete(key)
    assert await storage.exists(key) is False


def test_build_object_key_sanitises_traversal() -> None:
    key = build_object_key(prefix="resumes", filename="../../etc/passwd")
    assert ".." not in key
