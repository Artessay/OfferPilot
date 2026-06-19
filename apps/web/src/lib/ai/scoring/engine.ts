/** The deterministic match scorer — a faithful port of `app/ai/scoring/engine.py`. */
import { cosineSimilarity, tokenize } from "@/lib/ai/embedding";
import {
  DIMENSIONS,
  RISK_WEIGHT,
  SCORING_VERSION,
  levelForScore,
} from "@/lib/ai/scoring/weights";

const ACTION_VERBS = [
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
];
const QUANTIFIER = /\d+(\.\d+)?\s*[%％万亿kKmM]?/;

export interface KeywordWeight {
  term: string;
  weight: number;
}

export interface ScoreInputs {
  resumeSkillTags: string[];
  resumeText: string;
  resumeEmbedding: number[] | null;
  jobHardSkills: string[];
  jobSoftSkills: string[];
  jobRequirements: string[];
  jobResponsibilities: string[];
  jobKeywords: KeywordWeight[];
  jobEmbedding: number[] | null;
  jobCity?: string | null;
  targetCities?: string[];
}

export interface DimensionScoreOut {
  code: string;
  name: string;
  score: number;
  weight: number;
  evidenceRefs: string[];
}
export interface EvidenceOut {
  id: string;
  type: string;
  text: string;
}
export interface StrengthOut {
  title: string;
  description: string;
  evidenceRefs: string[];
}
export interface GapOut {
  category: string;
  severity: string;
  description: string;
  evidenceRefs: string[];
}
export interface RiskOut {
  type: string;
  description: string;
}

export interface ScoreResult {
  overallScore: number;
  matchLevel: string;
  dimensionScores: DimensionScoreOut[];
  strengths: StrengthOut[];
  gaps: GapOut[];
  risks: RiskOut[];
  evidence: EvidenceOut[];
  summary: string;
  matchedHardSkills: string[];
  missingHardSkills: string[];
  scoringVersion: string;
}

/** Banker's rounding (round half to even) to match Python's built-in round(). */
function pyRound(value: number): number {
  const floor = Math.floor(value);
  const diff = value - floor;
  if (diff < 0.5) return floor;
  if (diff > 0.5) return floor + 1;
  return floor % 2 === 0 ? floor : floor + 1;
}

function coverage(items: string[], resumeTokens: Set<string>): number {
  if (!items.length) return 0.5;
  let covered = 0;
  for (const item of items) {
    const itemTokens = new Set(tokenize(item));
    if (!itemTokens.size) continue;
    let inter = 0;
    for (const t of itemTokens) if (resumeTokens.has(t)) inter += 1;
    if (inter / itemTokens.size >= 0.25) covered += 1;
  }
  return covered / items.length;
}

function skillScore(matched: string[], required: string[]): number {
  if (!required.length) return 70.0;
  return (100.0 * matched.length) / required.length;
}

function experienceScore(inp: ScoreInputs, resumeTokens: Set<string>): number {
  let sim = 0.0;
  if (inp.resumeEmbedding && inp.jobEmbedding) {
    sim = cosineSimilarity(inp.resumeEmbedding, inp.jobEmbedding);
  }
  const cov = coverage(inp.jobResponsibilities, resumeTokens);
  return Math.min(100.0, (0.6 * sim + 0.4 * cov) * 100.0);
}

function keywordScore(keywords: KeywordWeight[], resumeTokens: Set<string>): number {
  if (!keywords.length) return 65.0;
  const total = keywords.reduce((acc, kw) => acc + Number(kw.weight ?? 1.0), 0);
  if (total === 0) return 65.0;
  const hit = keywords.reduce(
    (acc, kw) => acc + (resumeTokens.has(String(kw.term ?? "").toLowerCase()) ? Number(kw.weight ?? 1.0) : 0),
    0,
  );
  return (100.0 * hit) / total;
}

function basicScore(inp: ScoreInputs): number {
  let score = 78.0;
  const targetCities = inp.targetCities ?? [];
  if (inp.jobCity && targetCities.length) {
    if (targetCities.includes(inp.jobCity)) score += 15.0;
    else score -= 12.0;
  }
  return Math.max(0.0, Math.min(100.0, score));
}

function softScore(jobSoft: string[], resumeTokens: Set<string>): number {
  if (!jobSoft.length) return 70.0;
  const tokens = [...resumeTokens];
  const matched = jobSoft.filter((s) => tokens.some((t) => s.toLowerCase().includes(t))).length;
  return (100.0 * matched) / jobSoft.length;
}

function expressionScore(text: string): number {
  let score = 55.0;
  if (QUANTIFIER.test(text)) score += 20.0;
  if (ACTION_VERBS.some((verb) => text.toLowerCase().includes(verb))) score += 15.0;
  if (text.length >= 200) score += 10.0;
  return Math.min(100.0, score);
}

function riskScore(missing: string[], required: string[], experience: number): number {
  let risk = 0.0;
  if (required.length) risk += (60.0 * missing.length) / required.length;
  if (experience < 35.0) risk += 30.0;
  return Math.min(100.0, risk);
}

function buildEvidence(matched: string[], missing: string[], inp: ScoreInputs): EvidenceOut[] {
  const evidence: EvidenceOut[] = [];
  if (matched.length) {
    evidence.push({
      id: "ev_matched_skills",
      type: "matched_reason",
      text: `简历覆盖岗位要求的技能：${matched.join("、")}`,
    });
  }
  if (missing.length) {
    evidence.push({
      id: "ev_missing_skills",
      type: "missing_reason",
      text: `岗位要求但简历未体现的技能：${missing.join("、")}`,
    });
  }
  if (inp.jobRequirements.length) {
    evidence.push({
      id: "ev_job_requirement",
      type: "job_requirement",
      text: inp.jobRequirements[0],
    });
  }
  return evidence;
}

function dimensionEvidenceRefs(code: string, matched: string[], missing: string[]): string[] {
  if (code === "hard_skills") {
    const refs: string[] = [];
    if (matched.length) refs.push("ev_matched_skills");
    if (missing.length) refs.push("ev_missing_skills");
    return refs;
  }
  return [];
}

function buildStrengths(matched: string[], scores: Record<string, number>): StrengthOut[] {
  const strengths: StrengthOut[] = [];
  if (matched.length) {
    strengths.push({
      title: "核心技能匹配",
      description: `简历技能覆盖岗位要求：${matched.join("、")}。`,
      evidenceRefs: ["ev_matched_skills"],
    });
  }
  if (scores.experience >= 70) {
    strengths.push({
      title: "经历相关度较高",
      description: "项目与实习经历与岗位职责方向较为一致。",
      evidenceRefs: [],
    });
  }
  if (scores.expression_quality >= 80) {
    strengths.push({
      title: "表达清晰且有量化",
      description: "简历包含量化结果与有力的动作描述。",
      evidenceRefs: [],
    });
  }
  return strengths;
}

function buildGaps(missing: string[], scores: Record<string, number>): GapOut[] {
  const gaps: GapOut[] = [];
  if (missing.length) {
    gaps.push({
      category: "keyword",
      severity: missing.length >= 3 ? "high" : "medium",
      description: `岗位要求的技能在简历中缺失或未突出：${missing.join("、")}。`,
      evidenceRefs: ["ev_missing_skills"],
    });
  }
  if (scores.experience < 55) {
    gaps.push({
      category: "experience",
      severity: "medium",
      description: "简历经历与岗位职责的相关度不足，建议强化对应项目表达。",
      evidenceRefs: [],
    });
  }
  if (scores.expression_quality < 60) {
    gaps.push({
      category: "impact",
      severity: "medium",
      description: "项目描述缺少量化结果或有力动作，影响说服力。",
      evidenceRefs: [],
    });
  }
  return gaps;
}

function buildRisks(missing: string[], risk: number): RiskOut[] {
  const risks: RiskOut[] = [];
  if (risk >= 50) {
    risks.push({
      type: "hard_requirement",
      description: "存在多项关键技能缺口，初筛通过存在较高风险。",
    });
  } else if (missing.length) {
    risks.push({
      type: "skill_gap",
      description: "存在部分技能缺口，建议优先补强后再投递。",
    });
  }
  return risks;
}

function buildSummary(score: number, matched: string[], missing: string[]): string {
  const parts = [`综合匹配度 ${score} 分。`];
  if (matched.length) parts.push(`优势技能：${matched.slice(0, 5).join("、")}。`);
  if (missing.length) parts.push(`建议补强：${missing.slice(0, 5).join("、")}。`);
  return parts.join("");
}

/** Compute a multi-dimension match score with evidence and gaps. */
export function scoreMatch(inp: ScoreInputs): ScoreResult {
  const resumeSkills = new Set(inp.resumeSkillTags.map((s) => s.toLowerCase()));
  const resumeTokens = new Set(tokenize(inp.resumeText));

  const matchedHard = inp.jobHardSkills.filter((s) => resumeSkills.has(s.toLowerCase()));
  const missingHard = inp.jobHardSkills.filter((s) => !resumeSkills.has(s.toLowerCase()));

  const hard = skillScore(matchedHard, inp.jobHardSkills);
  const experience = experienceScore(inp, resumeTokens);
  const keywords = keywordScore(inp.jobKeywords, resumeTokens);
  const basic = basicScore(inp);
  const soft = softScore(inp.jobSoftSkills, resumeTokens);
  const expression = expressionScore(inp.resumeText);
  const risk = riskScore(missingHard, inp.jobHardSkills, experience);

  const scores: Record<string, number> = {
    hard_skills: hard,
    experience,
    keywords,
    basic_conditions: basic,
    soft_skills_interest: soft,
    expression_quality: expression,
  };
  let overall = 0;
  for (const [code, [, weight]] of Object.entries(DIMENSIONS)) overall += scores[code] * weight;
  overall -= risk * RISK_WEIGHT;
  const overallInt = Math.max(0, Math.min(100, pyRound(overall)));

  const evidence = buildEvidence(matchedHard, missingHard, inp);
  const dimensionScores: DimensionScoreOut[] = Object.entries(DIMENSIONS).map(
    ([code, [name, weight]]) => ({
      code,
      name,
      score: pyRound(scores[code]),
      weight: pyRound(weight * 100),
      evidenceRefs: dimensionEvidenceRefs(code, matchedHard, missingHard),
    }),
  );

  return {
    overallScore: overallInt,
    matchLevel: levelForScore(overallInt),
    dimensionScores,
    strengths: buildStrengths(matchedHard, scores),
    gaps: buildGaps(missingHard, scores),
    risks: buildRisks(missingHard, risk),
    evidence,
    summary: buildSummary(overallInt, matchedHard, missingHard),
    matchedHardSkills: matchedHard,
    missingHardSkills: missingHard,
    scoringVersion: SCORING_VERSION,
  };
}
