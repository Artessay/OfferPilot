/**
 * Tiered recommendation logic — a port of `app/ai/recommendation.py`.
 *
 * Pure functions that turn a match ScoreResult plus profile/job context into
 * recommendation indicators (match score, success-probability, opportunity
 * value, risk level) and classify each job into an opportunity tier.
 *
 * The success-probability is a prediction for decision support only — never a
 * promise of an interview or offer.
 */
import type { ScoreResult } from "@/lib/ai/scoring/engine";

export const TIER_EXPLORATORY = "exploratory";
export const TIER_PRIORITY = "priority";
export const TIER_BASELINE = "baseline";

export const RISK_LOW = "low";
export const RISK_MEDIUM = "medium";
export const RISK_HIGH = "high";

export const STRATEGY_BALANCED = "balanced";
export const STRATEGY_AGGRESSIVE = "aggressive";
export const STRATEGY_CONSERVATIVE = "conservative";

// strategy -> success-probability threshold separating priority/baseline.
const STRATEGY_PROB_THRESHOLD: Record<string, number> = {
  [STRATEGY_BALANCED]: 0.5,
  [STRATEGY_AGGRESSIVE]: 0.4,
  [STRATEGY_CONSERVATIVE]: 0.6,
};

export interface JobContext {
  targetRoles: string[];
  targetCities: string[];
  industries: string[];
  jobTitle: string;
  jobCompany: string | null;
  jobCity: string | null;
}

export interface TierResult {
  tier: string;
  matchScore: number;
  successProbability: number;
  opportunityValue: number;
  riskLevel: string;
  tierReason: string;
  suggestedAction: string;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Estimate initial-screening pass probability from the score result. */
export function predictSuccessProbability(result: ScoreResult): number {
  const base = result.overallScore / 100.0;
  let gapRatio = 0.0;
  const totalRequired = result.matchedHardSkills.length + result.missingHardSkills.length;
  if (totalRequired) gapRatio = result.missingHardSkills.length / totalRequired;
  const prob = base * (1.0 - 0.45 * gapRatio);
  return round2(Math.max(0.05, Math.min(0.95, prob)));
}

export function riskLevel(result: ScoreResult): string {
  const totalRequired = result.matchedHardSkills.length + result.missingHardSkills.length;
  const gapRatio = totalRequired ? result.missingHardSkills.length / totalRequired : 0.0;
  if (gapRatio >= 0.5 || result.overallScore < 50) return RISK_HIGH;
  if (gapRatio >= 0.25 || result.overallScore < 68) return RISK_MEDIUM;
  return RISK_LOW;
}

/** Score how valuable the opportunity is vs the user's goals (0–100). */
export function opportunityValue(ctx: JobContext): number {
  let score = 55;
  const titleLower = ctx.jobTitle.toLowerCase();
  if (ctx.targetRoles.some((role) => role && titleLower.includes(role.toLowerCase()))) score += 25;
  if (ctx.jobCity && ctx.targetCities.includes(ctx.jobCity)) score += 12;
  if (ctx.jobCompany) score += 8;
  return Math.max(0, Math.min(100, score));
}

/** Assign an opportunity tier with a human-readable reason and action. */
export function classifyTier(args: {
  result: ScoreResult;
  opportunity: number;
  successProbability: number;
  risk: string;
  strategy?: string;
}): TierResult {
  const { result, opportunity, successProbability, risk, strategy = STRATEGY_BALANCED } = args;
  const threshold = STRATEGY_PROB_THRESHOLD[strategy] ?? 0.5;
  const score = result.overallScore;

  let tier: string;
  let reason: string;
  let action: string;

  if (score >= 70 && successProbability >= threshold && risk !== RISK_HIGH) {
    tier = TIER_PRIORITY;
    reason = "岗位匹配度与申请成功率预测均较高，风险可控，建议优先准备与投递。";
    action = "生成完整匹配报告并优先投递。";
  } else if (opportunity >= 70 && (successProbability < threshold || risk === RISK_HIGH)) {
    tier = TIER_EXPLORATORY;
    reason = "机会价值较高，但成功率预测偏低或存在中高风险，值得尝试并优先优化材料。";
    action = "优化简历后再投递，或补齐关键技能。";
  } else if (successProbability >= threshold && risk !== RISK_HIGH) {
    tier = TIER_BASELINE;
    reason = "申请成功率预测较高、风险较低，可作为投递组合的稳定保障。";
    action = "保持简历对齐即可投递，保证反馈稳定性。";
  } else {
    tier = TIER_EXPLORATORY;
    reason = "综合指标存在不确定性，建议作为拓展机会谨慎尝试。";
    action = "结合匹配报告评估后再决定是否投递。";
  }

  return {
    tier,
    matchScore: score,
    successProbability,
    opportunityValue: opportunity,
    riskLevel: risk,
    tierReason: reason,
    suggestedAction: action,
  };
}
