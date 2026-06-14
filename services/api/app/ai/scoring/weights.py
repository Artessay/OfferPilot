"""Scoring dimension definitions and default weights (design §5.3)."""

from __future__ import annotations

SCORING_VERSION = "scoring_v1"

# code -> (display name, weight). Positive weights sum to 0.95; risk is
# subtracted with weight 0.05 (see MatchScorer.score).
DIMENSIONS: dict[str, tuple[str, float]] = {
    "hard_skills": ("硬技能匹配", 0.25),
    "experience": ("经历相关度", 0.25),
    "keywords": ("关键词覆盖", 0.15),
    "basic_conditions": ("教育与基础条件", 0.10),
    "soft_skills_interest": ("软技能与职业兴趣", 0.10),
    "expression_quality": ("表达质量", 0.10),
}

RISK_WEIGHT = 0.05

# Score thresholds -> level (design §5.3).
LEVEL_THRESHOLDS: list[tuple[int, str]] = [
    (85, "excellent"),
    (70, "high"),
    (55, "medium"),
    (0, "low"),
]


def level_for_score(score: int) -> str:
    for threshold, level in LEVEL_THRESHOLDS:
        if score >= threshold:
            return level
    return "low"
