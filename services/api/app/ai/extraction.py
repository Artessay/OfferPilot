"""Rule-based extraction of structure from resume and JD plain text.

These deterministic heuristics are the always-available core: they require no
LLM, run in milliseconds, and produce the structured shapes persisted to the
database. A real LLM (when configured) can refine these results, but the system
is fully functional without one.
"""

from __future__ import annotations

import re
from typing import Any

from app.ai.embedding import tokenize
from app.ai.skills import extract_hard_skills, extract_soft_skills

_BULLET = re.compile(r"^[\s\-•·*●▪\d.)、]+")
_STOPWORDS = {
    "的",
    "和",
    "与",
    "及",
    "等",
    "在",
    "了",
    "我们",
    "你",
    "并",
    "the",
    "and",
    "a",
    "to",
    "of",
    "for",
    "with",
    "in",
    "on",
}

RESUME_SECTIONS: dict[str, list[str]] = {
    "education": ["教育", "教育背景", "education", "学历"],
    "experience": ["实习", "工作经历", "实习经历", "工作经验", "experience", "work"],
    "project": ["项目", "项目经历", "project"],
    "skills": ["技能", "专业技能", "skills", "技能特长"],
    "awards": ["获奖", "荣誉", "奖项", "award", "honor", "证书", "certificate"],
}

JD_SECTIONS: dict[str, list[str]] = {
    "responsibilities": ["岗位职责", "工作职责", "职责", "responsibilities", "工作内容"],
    "requirements": ["任职要求", "岗位要求", "任职资格", "requirements", "要求"],
    "bonus": ["加分项", "加分", "bonus", "优先", "nice to have"],
}


def _looks_like_header(line: str, keywords: list[str]) -> bool:
    stripped = _BULLET.sub("", line).strip()
    if len(stripped) > 16:
        return False
    # Real headers are short labels, not full sentences ending in punctuation.
    if stripped and stripped[-1] in "。.；;，,!！?？":
        return False
    lowered = stripped.lower().rstrip("：:")
    return any(kw.lower() in lowered for kw in keywords)


def split_sections(text: str, section_map: dict[str, list[str]]) -> dict[str, str]:
    """Split text into named sections by detecting short header lines."""
    sections: dict[str, list[str]] = {key: [] for key in section_map}
    sections["_intro"] = []
    current = "_intro"
    for raw_line in text.split("\n"):
        line = raw_line.strip()
        if not line:
            continue
        matched = next(
            (key for key, kws in section_map.items() if _looks_like_header(line, kws)),
            None,
        )
        if matched is not None:
            current = matched
            continue
        sections[current].append(line)
    return {key: "\n".join(lines) for key, lines in sections.items()}


def _bullets(text: str) -> list[str]:
    items: list[str] = []
    for line in text.split("\n"):
        cleaned = _BULLET.sub("", line).strip()
        if len(cleaned) >= 4:
            items.append(cleaned)
    return items


def extract_keywords(text: str, *, top_k: int = 20) -> list[str]:
    """Return the most frequent meaningful tokens as keywords."""
    counts: dict[str, int] = {}
    for token in tokenize(text):
        if len(token) < 2 or token in _STOPWORDS:
            continue
        counts[token] = counts.get(token, 0) + 1
    ranked = sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))
    return [term for term, _ in ranked[:top_k]]


def parse_resume(text: str) -> dict[str, Any]:
    """Extract structured resume data from plain text."""
    sections = split_sections(text, RESUME_SECTIONS)
    hard = extract_hard_skills(text)
    soft = extract_soft_skills(text)
    structured: dict[str, Any] = {
        "education": _bullets(sections.get("education", "")),
        "experiences": _bullets(sections.get("experience", "")),
        "projects": _bullets(sections.get("project", "")),
        "awards": _bullets(sections.get("awards", "")),
        "hard_skills": hard,
        "soft_skills": soft,
    }
    skill_tags = sorted(set(hard + soft))
    summary = _summarize_resume(structured, skill_tags)
    return {"structured_data": structured, "skill_tags": skill_tags, "summary": summary}


def _summarize_resume(structured: dict[str, Any], skill_tags: list[str]) -> str:
    parts: list[str] = []
    if skill_tags:
        parts.append(f"技能覆盖：{'、'.join(skill_tags[:8])}")
    if structured["projects"]:
        parts.append(f"包含 {len(structured['projects'])} 段项目经历")
    if structured["experiences"]:
        parts.append(f"{len(structured['experiences'])} 段实习/工作经历")
    return "；".join(parts) if parts else "已解析简历文本，建议补充项目与技能描述。"


def parse_jd(text: str) -> dict[str, Any]:
    """Extract structured JD data from plain text."""
    sections = split_sections(text, JD_SECTIONS)
    responsibilities = _bullets(sections.get("responsibilities", "")) or _bullets(
        sections.get("_intro", "")
    )
    requirements = _bullets(sections.get("requirements", ""))
    bonus = _bullets(sections.get("bonus", ""))
    hard = extract_hard_skills(text)
    soft = extract_soft_skills(text)
    keyword_terms = extract_keywords(text)
    keywords = [
        {"term": term, "weight": round(1.0 - i * 0.04, 2)} for i, term in enumerate(keyword_terms)
    ]
    return {
        "responsibilities": responsibilities,
        "requirements": requirements,
        "hard_skills": hard,
        "soft_skills": soft,
        "keywords": keywords,
        "bonus_points": bonus,
        "seniority_level": _infer_seniority(text),
    }


def _infer_seniority(text: str) -> str:
    lowered = text.lower()
    if any(k in lowered for k in ["实习", "intern"]):
        return "internship"
    if any(k in lowered for k in ["应届", "校招", "graduate", "entry"]):
        return "entry"
    if any(k in lowered for k in ["资深", "senior", "高级"]):
        return "senior"
    return "unspecified"
