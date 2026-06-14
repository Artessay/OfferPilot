"""Tiered recommendation logic (design §5.4).

Pure functions that turn a match :class:`ScoreResult` plus profile/job context
into the recommendation indicators — match score, success-probability
prediction, opportunity value, risk level — and classify each job into an
opportunity tier. Kept dependency-free for deterministic testing.

The success-probability is a *prediction for decision support only* — never a
promise of an interview or offer (business rule BR09 / design §5.4).
"""

from __future__ import annotations

from dataclasses import dataclass

from app.ai.scoring.engine import ScoreResult

# Opportunity tiers.
TIER_EXPLORATORY = "exploratory"
TIER_PRIORITY = "priority"
TIER_BASELINE = "baseline"

# Risk levels.
RISK_LOW = "low"
RISK_MEDIUM = "medium"
RISK_HIGH = "high"

STRATEGY_BALANCED = "balanced"
STRATEGY_AGGRESSIVE = "aggressive"
STRATEGY_CONSERVATIVE = "conservative"

# strategy -> success-probability threshold separating priority/baseline.
_STRATEGY_PROB_THRESHOLD = {
    STRATEGY_BALANCED: 0.5,
    STRATEGY_AGGRESSIVE: 0.4,
    STRATEGY_CONSERVATIVE: 0.6,
}


@dataclass(slots=True)
class JobContext:
    """Profile-vs-job context used to compute opportunity value."""

    target_roles: list[str]
    target_cities: list[str]
    industries: list[str]
    job_title: str
    job_company: str | None
    job_city: str | None


@dataclass(slots=True)
class TierResult:
    tier: str
    match_score: int
    success_probability: float
    opportunity_value: int
    risk_level: str
    tier_reason: str
    suggested_action: str


def predict_success_probability(result: ScoreResult) -> float:
    """Estimate initial-screening pass probability from the score result.

    Decision-support only; not a promise. Combines overall score with a penalty
    for missing hard requirements.
    """
    base = result.overall_score / 100.0
    gap_ratio = 0.0
    total_required = len(result.matched_hard_skills) + len(result.missing_hard_skills)
    if total_required:
        gap_ratio = len(result.missing_hard_skills) / total_required
    prob = base * (1.0 - 0.45 * gap_ratio)
    return round(max(0.05, min(0.95, prob)), 2)


def risk_level(result: ScoreResult) -> str:
    total_required = len(result.matched_hard_skills) + len(result.missing_hard_skills)
    gap_ratio = (len(result.missing_hard_skills) / total_required) if total_required else 0.0
    if gap_ratio >= 0.5 or result.overall_score < 50:
        return RISK_HIGH
    if gap_ratio >= 0.25 or result.overall_score < 68:
        return RISK_MEDIUM
    return RISK_LOW


def opportunity_value(ctx: JobContext) -> int:
    """Score how valuable the opportunity is vs the user's goals (0–100)."""
    score = 55
    title_lower = ctx.job_title.lower()
    if any(role and role.lower() in title_lower for role in ctx.target_roles):
        score += 25
    if ctx.job_city and ctx.job_city in ctx.target_cities:
        score += 12
    if ctx.job_company:
        score += 8
    return max(0, min(100, score))


def classify_tier(
    *,
    result: ScoreResult,
    opportunity: int,
    success_probability: float,
    risk: str,
    strategy: str = STRATEGY_BALANCED,
) -> TierResult:
    """Assign an opportunity tier with a human-readable reason and action."""
    threshold = _STRATEGY_PROB_THRESHOLD.get(strategy, 0.5)
    score = result.overall_score

    if score >= 70 and success_probability >= threshold and risk != RISK_HIGH:
        tier = TIER_PRIORITY
        reason = "岗位匹配度与申请成功率预测均较高，风险可控，建议优先准备与投递。"
        action = "生成完整匹配报告并优先投递。"
    elif opportunity >= 70 and (success_probability < threshold or risk == RISK_HIGH):
        tier = TIER_EXPLORATORY
        reason = "机会价值较高，但成功率预测偏低或存在中高风险，值得尝试并优先优化材料。"
        action = "优化简历后再投递，或补齐关键技能。"
    elif success_probability >= threshold and risk != RISK_HIGH:
        tier = TIER_BASELINE
        reason = "申请成功率预测较高、风险较低，可作为投递组合的稳定保障。"
        action = "保持简历对齐即可投递，保证反馈稳定性。"
    else:
        tier = TIER_EXPLORATORY
        reason = "综合指标存在不确定性，建议作为拓展机会谨慎尝试。"
        action = "结合匹配报告评估后再决定是否投递。"

    return TierResult(
        tier=tier,
        match_score=score,
        success_probability=success_probability,
        opportunity_value=opportunity,
        risk_level=risk,
        tier_reason=reason,
        suggested_action=action,
    )
