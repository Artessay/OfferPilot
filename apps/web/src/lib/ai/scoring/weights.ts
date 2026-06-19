/** Scoring dimension definitions and default weights — port of `weights.py`. */

export const SCORING_VERSION = "scoring_v1";

/**
 * code -> [display name, weight]. Positive weights sum to 0.95; risk is
 * subtracted with weight 0.05 (see MatchScorer.score).
 */
export const DIMENSIONS: Record<string, [name: string, weight: number]> = {
  hard_skills: ["硬技能匹配", 0.25],
  experience: ["经历相关度", 0.25],
  keywords: ["关键词覆盖", 0.15],
  basic_conditions: ["教育与基础条件", 0.1],
  soft_skills_interest: ["软技能与职业兴趣", 0.1],
  expression_quality: ["表达质量", 0.1],
};

export const RISK_WEIGHT = 0.05;

// Score thresholds -> level.
const LEVEL_THRESHOLDS: Array<[threshold: number, level: string]> = [
  [85, "excellent"],
  [70, "high"],
  [55, "medium"],
  [0, "low"],
];

export function levelForScore(score: number): string {
  for (const [threshold, level] of LEVEL_THRESHOLDS) {
    if (score >= threshold) return level;
  }
  return "low";
}
