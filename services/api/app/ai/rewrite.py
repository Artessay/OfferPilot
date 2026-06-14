"""AI resume rewrite logic with fact-consistency guarding (design §5.7).

Rewrites only optimise *expression*; they must never introduce facts (skills,
metrics, companies, schools, projects) absent from the original resume. The
fact-consistency check is the deterministic safety net enforced regardless of
which provider produced the draft (business rule BR10).
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

from app.ai.embedding import tokenize
from app.ai.skills import extract_hard_skills

_NUMBER = re.compile(r"\d+(?:\.\d+)?\s*[%％万亿]?")


@dataclass(slots=True)
class DiffBlock:
    section: str
    original: str
    rewritten: str
    reason: str
    risk_warning: str


def extract_numbers(text: str) -> set[str]:
    return {m.group(0).replace(" ", "") for m in _NUMBER.finditer(text)}


def check_fact_consistency(original_resume_text: str, rewritten_text: str) -> list[str]:
    """Return a list of fabricated-fact violations (empty == consistent).

    Flags numbers and hard skills present in ``rewritten_text`` that do not
    appear anywhere in the original resume.
    """
    violations: list[str] = []
    orig_numbers = extract_numbers(original_resume_text)
    for num in extract_numbers(rewritten_text):
        if num not in orig_numbers:
            violations.append(f"引入了原简历不存在的数字指标：{num}")

    orig_skills = {s.lower() for s in extract_hard_skills(original_resume_text)}
    for skill in extract_hard_skills(rewritten_text):
        if skill.lower() not in orig_skills:
            violations.append(f"引入了原简历不存在的技能：{skill}")
    return violations


def build_rewrite_drafts(
    *,
    original_resume_text: str,
    resume_skill_tags: list[str],
    accepted_suggestions: list[dict[str, Any]],
    job_hard_skills: list[str],
) -> tuple[list[DiffBlock], list[str]]:
    """Build safe rewrite diff blocks plus a real-experience materials checklist.

    Returns ``(diff_blocks, materials_checklist)``. Non-rewritable suggestions
    (those requiring genuinely new experience) never produce drafts; they are
    surfaced as a materials checklist instead.
    """
    diff_blocks: list[DiffBlock] = []
    materials: list[str] = []

    # Skills that are both in the resume and required by the JD can be safely
    # re-emphasised (they are real facts already present).
    resume_skills_lower = {s.lower() for s in resume_skill_tags}
    emphasise = [s for s in job_hard_skills if s.lower() in resume_skills_lower]

    segments = _segments(original_resume_text)
    for suggestion in accepted_suggestions:
        if not suggestion.get("rewritable", True):
            materials.append(
                suggestion.get("suggestion")
                or "该建议需要真实补充经历或技能，请据实完善后再更新简历。"
            )
            continue

        section, original = _pick_segment(segments, suggestion)
        rewritten = _safe_rewrite(original, suggestion, emphasise)
        if rewritten == original:
            continue
        # Defensive: never emit a draft that fails consistency.
        if check_fact_consistency(original_resume_text, rewritten):
            continue
        diff_blocks.append(
            DiffBlock(
                section=section,
                original=original,
                rewritten=rewritten,
                reason=suggestion.get("reason") or "强化与目标岗位的表达对齐。",
                risk_warning="未新增原简历不存在的技能或数字指标。",
            )
        )

    return diff_blocks, materials


def _segments(text: str) -> list[str]:
    return [line.strip() for line in text.split("\n") if len(line.strip()) >= 4]


def _pick_segment(segments: list[str], suggestion: dict[str, Any]) -> tuple[str, str]:
    """Pick the most relevant original line for a suggestion."""
    category = suggestion.get("category", "")
    keywords = {"experience": ["实习", "项目", "负责"], "impact": ["项目", "分析", "完成"]}
    hints = keywords.get(category, [])
    for seg in segments:
        if any(h in seg for h in hints):
            return "项目经历", seg
    return ("项目经历", segments[0]) if segments else ("项目经历", "")


def _safe_rewrite(original: str, suggestion: dict[str, Any], emphasise: list[str]) -> str:
    """Produce a deterministic, fact-safe rewrite of a segment.

    Re-emphasises skills already present in the resume; introduces no new facts.
    A real LLM provider can replace this with richer phrasing while the
    consistency check continues to guard the output.
    """
    original_tokens = set(tokenize(original))
    relevant = [s for s in emphasise if s.lower() in original_tokens or s in original]
    if not relevant:
        # Nothing safe to add without inventing facts.
        return original
    skills = "、".join(dict.fromkeys(relevant))
    return f"{original}（突出 {skills} 的应用与成果）"
