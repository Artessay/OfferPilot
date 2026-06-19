/**
 * AI resume rewrite logic with fact-consistency guarding — a port of
 * `app/ai/rewrite.py`.
 *
 * Rewrites only optimise *expression*; they must never introduce facts (skills,
 * metrics, companies, schools, projects) absent from the original resume. The
 * fact-consistency check is the deterministic safety net.
 */
import { tokenize } from "@/lib/ai/embedding";
import { extractHardSkills } from "@/lib/ai/skills";

const NUMBER = /\d+(?:\.\d+)?\s*[%％万亿]?/g;

export interface DiffBlock {
  section: string;
  original: string;
  rewritten: string;
  reason: string;
  riskWarning: string;
}

export interface RewriteSuggestionInput {
  category?: string;
  suggestion?: string | null;
  reason?: string | null;
  rewritable?: boolean;
}

export function extractNumbers(text: string): Set<string> {
  const result = new Set<string>();
  for (const match of text.matchAll(NUMBER)) result.add(match[0].replace(/ /g, ""));
  return result;
}

/**
 * Return a list of fabricated-fact violations (empty == consistent). Flags
 * numbers and hard skills present in `rewrittenText` that do not appear
 * anywhere in the original resume.
 */
export function checkFactConsistency(originalResumeText: string, rewrittenText: string): string[] {
  const violations: string[] = [];
  const origNumbers = extractNumbers(originalResumeText);
  for (const num of extractNumbers(rewrittenText)) {
    if (!origNumbers.has(num)) violations.push(`引入了原简历不存在的数字指标：${num}`);
  }
  const origSkills = new Set(extractHardSkills(originalResumeText).map((s) => s.toLowerCase()));
  for (const skill of extractHardSkills(rewrittenText)) {
    if (!origSkills.has(skill.toLowerCase())) violations.push(`引入了原简历不存在的技能：${skill}`);
  }
  return violations;
}

function segments(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length >= 4);
}

const PICK_HINTS: Record<string, string[]> = {
  experience: ["实习", "项目", "负责"],
  impact: ["项目", "分析", "完成"],
};

function pickSegment(segs: string[], suggestion: RewriteSuggestionInput): [section: string, original: string] {
  const hints = PICK_HINTS[suggestion.category ?? ""] ?? [];
  for (const seg of segs) {
    if (hints.some((h) => seg.includes(h))) return ["项目经历", seg];
  }
  return segs.length ? ["项目经历", segs[0]] : ["项目经历", ""];
}

function safeRewrite(original: string, emphasise: string[]): string {
  const originalTokens = new Set(tokenize(original));
  const relevant = emphasise.filter((s) => originalTokens.has(s.toLowerCase()) || original.includes(s));
  if (!relevant.length) return original;
  const skills = [...new Set(relevant)].join("、");
  return `${original}（突出 ${skills} 的应用与成果）`;
}

/**
 * Build safe rewrite diff blocks plus a real-experience materials checklist.
 * Non-rewritable suggestions never produce drafts; they surface as a checklist.
 */
export function buildRewriteDrafts(args: {
  originalResumeText: string;
  resumeSkillTags: string[];
  acceptedSuggestions: RewriteSuggestionInput[];
  jobHardSkills: string[];
}): { diffBlocks: DiffBlock[]; materials: string[] } {
  const { originalResumeText, resumeSkillTags, acceptedSuggestions, jobHardSkills } = args;
  const diffBlocks: DiffBlock[] = [];
  const materials: string[] = [];

  const resumeSkillsLower = new Set(resumeSkillTags.map((s) => s.toLowerCase()));
  const emphasise = jobHardSkills.filter((s) => resumeSkillsLower.has(s.toLowerCase()));

  const segs = segments(originalResumeText);
  for (const suggestion of acceptedSuggestions) {
    if (suggestion.rewritable === false) {
      materials.push(
        suggestion.suggestion || "该建议需要真实补充经历或技能，请据实完善后再更新简历。",
      );
      continue;
    }

    const [section, original] = pickSegment(segs, suggestion);
    const rewritten = safeRewrite(original, emphasise);
    if (rewritten === original) continue;
    // Defensive: never emit a draft that fails consistency.
    if (checkFactConsistency(originalResumeText, rewritten).length) continue;
    diffBlocks.push({
      section,
      original,
      rewritten,
      reason: suggestion.reason || "强化与目标岗位的表达对齐。",
      riskWarning: "未新增原简历不存在的技能或数字指标。",
    });
  }

  return { diffBlocks, materials };
}
