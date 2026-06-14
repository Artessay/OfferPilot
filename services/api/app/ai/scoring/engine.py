"""The deterministic match scorer."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

from app.ai.embedding import cosine_similarity, tokenize
from app.ai.scoring.weights import DIMENSIONS, RISK_WEIGHT, SCORING_VERSION, level_for_score

_ACTION_VERBS = (
    "负责",
    "完成",
    "提升",
    "优化",
    "设计",
    "搭建",
    "主导",
    "构建",
    "分析",
    "led",
    "built",
    "improved",
    "designed",
    "implemented",
    "analyzed",
)
_QUANTIFIER = re.compile(r"\d+(\.\d+)?\s*[%％万亿kKmM]?")


@dataclass(slots=True)
class ScoreInputs:
    """Pure inputs to the scorer (decoupled from ORM models)."""

    resume_skill_tags: list[str]
    resume_text: str
    resume_embedding: list[float] | None
    job_hard_skills: list[str]
    job_soft_skills: list[str]
    job_requirements: list[str]
    job_responsibilities: list[str]
    job_keywords: list[dict[str, Any]]
    job_embedding: list[float] | None
    job_city: str | None = None
    target_cities: list[str] = field(default_factory=list)


@dataclass(slots=True)
class ScoreResult:
    overall_score: int
    match_level: str
    dimension_scores: list[dict[str, Any]]
    strengths: list[dict[str, Any]]
    gaps: list[dict[str, Any]]
    risks: list[dict[str, Any]]
    evidence: list[dict[str, Any]]
    summary: str
    matched_hard_skills: list[str]
    missing_hard_skills: list[str]
    scoring_version: str = SCORING_VERSION


class MatchScorer:
    """Compute a multi-dimension match score with evidence and gaps."""

    def score(self, inp: ScoreInputs) -> ScoreResult:
        resume_skills = {s.lower() for s in inp.resume_skill_tags}
        resume_tokens = set(tokenize(inp.resume_text))

        matched_hard = [s for s in inp.job_hard_skills if s.lower() in resume_skills]
        missing_hard = [s for s in inp.job_hard_skills if s.lower() not in resume_skills]

        hard = self._skill_score(matched_hard, inp.job_hard_skills)
        experience = self._experience_score(inp, resume_tokens)
        keywords = self._keyword_score(inp.job_keywords, resume_tokens)
        basic = self._basic_score(inp)
        soft = self._soft_score(inp.job_soft_skills, resume_tokens)
        expression = self._expression_score(inp.resume_text)
        risk = self._risk_score(missing_hard, inp.job_hard_skills, experience)

        scores = {
            "hard_skills": hard,
            "experience": experience,
            "keywords": keywords,
            "basic_conditions": basic,
            "soft_skills_interest": soft,
            "expression_quality": expression,
        }
        overall = sum(scores[code] * weight for code, (_, weight) in DIMENSIONS.items())
        overall -= risk * RISK_WEIGHT
        overall_int = max(0, min(100, round(overall)))

        evidence = self._build_evidence(matched_hard, missing_hard, inp)
        dimension_scores = [
            {
                "code": code,
                "name": name,
                "score": round(scores[code]),
                "weight": round(weight * 100),
                "evidenceRefs": self._dimension_evidence_refs(code, matched_hard, missing_hard),
            }
            for code, (name, weight) in DIMENSIONS.items()
        ]
        strengths = self._strengths(matched_hard, scores)
        gaps = self._gaps(missing_hard, scores)
        risks = self._risks(missing_hard, risk)
        summary = self._summary(overall_int, matched_hard, missing_hard)

        return ScoreResult(
            overall_score=overall_int,
            match_level=level_for_score(overall_int),
            dimension_scores=dimension_scores,
            strengths=strengths,
            gaps=gaps,
            risks=risks,
            evidence=evidence,
            summary=summary,
            matched_hard_skills=matched_hard,
            missing_hard_skills=missing_hard,
        )

    # --- dimension scorers -------------------------------------------------
    @staticmethod
    def _skill_score(matched: list[str], required: list[str]) -> float:
        if not required:
            return 70.0
        return 100.0 * len(matched) / len(required)

    @staticmethod
    def _experience_score(inp: ScoreInputs, resume_tokens: set[str]) -> float:
        sim = 0.0
        if inp.resume_embedding and inp.job_embedding:
            sim = cosine_similarity(inp.resume_embedding, inp.job_embedding)
        coverage = _coverage(inp.job_responsibilities, resume_tokens)
        return min(100.0, (0.6 * sim + 0.4 * coverage) * 100.0)

    @staticmethod
    def _keyword_score(keywords: list[dict[str, Any]], resume_tokens: set[str]) -> float:
        if not keywords:
            return 65.0
        total = sum(float(kw.get("weight", 1.0)) for kw in keywords)
        if total == 0:
            return 65.0
        hit = sum(
            float(kw.get("weight", 1.0))
            for kw in keywords
            if str(kw.get("term", "")).lower() in resume_tokens
        )
        return 100.0 * hit / total

    @staticmethod
    def _basic_score(inp: ScoreInputs) -> float:
        score = 78.0
        if inp.job_city and inp.target_cities:
            if inp.job_city in inp.target_cities:
                score += 15.0
            else:
                score -= 12.0
        return max(0.0, min(100.0, score))

    @staticmethod
    def _soft_score(job_soft: list[str], resume_tokens: set[str]) -> float:
        if not job_soft:
            return 70.0
        matched = sum(1 for s in job_soft if any(t in s.lower() for t in resume_tokens))
        return 100.0 * matched / len(job_soft) if job_soft else 70.0

    @staticmethod
    def _expression_score(text: str) -> float:
        score = 55.0
        if _QUANTIFIER.search(text):
            score += 20.0
        if any(verb in text.lower() for verb in _ACTION_VERBS):
            score += 15.0
        if len(text) >= 200:
            score += 10.0
        return min(100.0, score)

    @staticmethod
    def _risk_score(missing: list[str], required: list[str], experience: float) -> float:
        risk = 0.0
        if required:
            risk += 60.0 * len(missing) / len(required)
        if experience < 35.0:
            risk += 30.0
        return min(100.0, risk)

    # --- narrative builders ------------------------------------------------
    @staticmethod
    def _build_evidence(
        matched: list[str], missing: list[str], inp: ScoreInputs
    ) -> list[dict[str, Any]]:
        evidence: list[dict[str, Any]] = []
        if matched:
            evidence.append(
                {
                    "id": "ev_matched_skills",
                    "type": "matched_reason",
                    "text": f"简历覆盖岗位要求的技能：{'、'.join(matched)}",
                }
            )
        if missing:
            evidence.append(
                {
                    "id": "ev_missing_skills",
                    "type": "missing_reason",
                    "text": f"岗位要求但简历未体现的技能：{'、'.join(missing)}",
                }
            )
        if inp.job_requirements:
            evidence.append(
                {
                    "id": "ev_job_requirement",
                    "type": "job_requirement",
                    "text": inp.job_requirements[0],
                }
            )
        return evidence

    @staticmethod
    def _dimension_evidence_refs(code: str, matched: list[str], missing: list[str]) -> list[str]:
        if code == "hard_skills":
            refs = []
            if matched:
                refs.append("ev_matched_skills")
            if missing:
                refs.append("ev_missing_skills")
            return refs
        return []

    @staticmethod
    def _strengths(matched: list[str], scores: dict[str, float]) -> list[dict[str, Any]]:
        strengths: list[dict[str, Any]] = []
        if matched:
            strengths.append(
                {
                    "title": "核心技能匹配",
                    "description": f"简历技能覆盖岗位要求：{'、'.join(matched)}。",
                    "evidenceRefs": ["ev_matched_skills"],
                }
            )
        if scores["experience"] >= 70:
            strengths.append(
                {
                    "title": "经历相关度较高",
                    "description": "项目与实习经历与岗位职责方向较为一致。",
                    "evidenceRefs": [],
                }
            )
        if scores["expression_quality"] >= 80:
            strengths.append(
                {
                    "title": "表达清晰且有量化",
                    "description": "简历包含量化结果与有力的动作描述。",
                    "evidenceRefs": [],
                }
            )
        return strengths

    @staticmethod
    def _gaps(missing: list[str], scores: dict[str, float]) -> list[dict[str, Any]]:
        gaps: list[dict[str, Any]] = []
        if missing:
            gaps.append(
                {
                    "category": "keyword",
                    "severity": "high" if len(missing) >= 3 else "medium",
                    "description": f"岗位要求的技能在简历中缺失或未突出：{'、'.join(missing)}。",
                    "evidenceRefs": ["ev_missing_skills"],
                }
            )
        if scores["experience"] < 55:
            gaps.append(
                {
                    "category": "experience",
                    "severity": "medium",
                    "description": "简历经历与岗位职责的相关度不足，建议强化对应项目表达。",
                    "evidenceRefs": [],
                }
            )
        if scores["expression_quality"] < 60:
            gaps.append(
                {
                    "category": "impact",
                    "severity": "medium",
                    "description": "项目描述缺少量化结果或有力动作，影响说服力。",
                    "evidenceRefs": [],
                }
            )
        return gaps

    @staticmethod
    def _risks(missing: list[str], risk: float) -> list[dict[str, Any]]:
        risks: list[dict[str, Any]] = []
        if risk >= 50:
            risks.append(
                {
                    "type": "hard_requirement",
                    "description": "存在多项关键技能缺口，初筛通过存在较高风险。",
                }
            )
        elif missing:
            risks.append(
                {
                    "type": "skill_gap",
                    "description": "存在部分技能缺口，建议优先补强后再投递。",
                }
            )
        return risks

    @staticmethod
    def _summary(score: int, matched: list[str], missing: list[str]) -> str:
        parts = [f"综合匹配度 {score} 分。"]
        if matched:
            parts.append(f"优势技能：{'、'.join(matched[:5])}。")
        if missing:
            parts.append(f"建议补强：{'、'.join(missing[:5])}。")
        return "".join(parts)


def _coverage(items: list[str], resume_tokens: set[str]) -> float:
    """Fraction of items whose tokens meaningfully overlap the resume."""
    if not items:
        return 0.5
    covered = 0
    for item in items:
        item_tokens = set(tokenize(item))
        if not item_tokens:
            continue
        overlap = len(item_tokens & resume_tokens) / len(item_tokens)
        if overlap >= 0.25:
            covered += 1
    return covered / len(items)
