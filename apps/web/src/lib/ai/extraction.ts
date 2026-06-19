/**
 * Rule-based extraction of structure from resume and JD plain text — a faithful
 * port of the backend `app/ai/extraction.py`. Deterministic heuristics, no LLM.
 */
import { tokenize } from "@/lib/ai/embedding";
import { extractHardSkills, extractSoftSkills } from "@/lib/ai/skills";

// Leading bullet / numbering characters stripped from the start of a line.
const BULLET = /^[\s\-•·*●▪\d.)、]+/;

const STOPWORDS = new Set([
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
]);

const RESUME_SECTIONS: Record<string, string[]> = {
  education: ["教育", "教育背景", "education", "学历"],
  experience: ["实习", "工作经历", "实习经历", "工作经验", "experience", "work"],
  project: ["项目", "项目经历", "project"],
  skills: ["技能", "专业技能", "skills", "技能特长"],
  awards: ["获奖", "荣誉", "奖项", "award", "honor", "证书", "certificate"],
};

const JD_SECTIONS: Record<string, string[]> = {
  responsibilities: ["岗位职责", "工作职责", "职责", "responsibilities", "工作内容"],
  requirements: ["任职要求", "岗位要求", "任职资格", "requirements", "要求"],
  bonus: ["加分项", "加分", "bonus", "优先", "nice to have"],
};

const SENTENCE_END = "。.；;，,!！?？";

function rstripChars(value: string, chars: string): string {
  let end = value.length;
  while (end > 0 && chars.includes(value[end - 1])) end -= 1;
  return value.slice(0, end);
}

function looksLikeHeader(line: string, keywords: string[]): boolean {
  const stripped = line.replace(BULLET, "").trim();
  if (stripped.length > 16) return false;
  // Real headers are short labels, not full sentences ending in punctuation.
  if (stripped && SENTENCE_END.includes(stripped[stripped.length - 1])) return false;
  const lowered = rstripChars(stripped.toLowerCase(), "：:");
  return keywords.some((kw) => lowered.includes(kw.toLowerCase()));
}

/** Split text into named sections by detecting short header lines. */
function splitSections(text: string, sectionMap: Record<string, string[]>): Record<string, string> {
  const sections: Record<string, string[]> = { _intro: [] };
  for (const key of Object.keys(sectionMap)) sections[key] = [];
  let current = "_intro";
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    let matched: string | null = null;
    for (const [key, kws] of Object.entries(sectionMap)) {
      if (looksLikeHeader(line, kws)) {
        matched = key;
        break;
      }
    }
    if (matched !== null) {
      current = matched;
      continue;
    }
    sections[current].push(line);
  }
  const out: Record<string, string> = {};
  for (const [key, lines] of Object.entries(sections)) out[key] = lines.join("\n");
  return out;
}

function bullets(text: string): string[] {
  const items: string[] = [];
  for (const line of text.split("\n")) {
    const cleaned = line.replace(BULLET, "").trim();
    if (cleaned.length >= 4) items.push(cleaned);
  }
  return items;
}

/** Return the most frequent meaningful tokens as keywords. */
export function extractKeywords(text: string, topK = 20): string[] {
  const counts = new Map<string, number>();
  for (const token of tokenize(text)) {
    if (token.length < 2 || STOPWORDS.has(token)) continue;
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  const ranked = [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0),
  );
  return ranked.slice(0, topK).map(([term]) => term);
}

export interface ParsedResume {
  structuredData: Record<string, unknown>;
  skillTags: string[];
  summary: string;
}

/** Extract structured resume data from plain text. */
export function parseResume(text: string): ParsedResume {
  const sections = splitSections(text, RESUME_SECTIONS);
  const hard = extractHardSkills(text);
  const soft = extractSoftSkills(text);
  const structuredData: Record<string, unknown> = {
    education: bullets(sections.education ?? ""),
    experiences: bullets(sections.experience ?? ""),
    projects: bullets(sections.project ?? ""),
    awards: bullets(sections.awards ?? ""),
    hard_skills: hard,
    soft_skills: soft,
  };
  const skillTags = [...new Set([...hard, ...soft])].sort();
  const summary = summarizeResume(structuredData, skillTags);
  return { structuredData, skillTags, summary };
}

function summarizeResume(structured: Record<string, unknown>, skillTags: string[]): string {
  const parts: string[] = [];
  const projects = (structured.projects as string[]) ?? [];
  const experiences = (structured.experiences as string[]) ?? [];
  if (skillTags.length) parts.push(`技能覆盖：${skillTags.slice(0, 8).join("、")}`);
  if (projects.length) parts.push(`包含 ${projects.length} 段项目经历`);
  if (experiences.length) parts.push(`${experiences.length} 段实习/工作经历`);
  return parts.length ? parts.join("；") : "已解析简历文本，建议补充项目与技能描述。";
}

export interface KeywordWeight {
  term: string;
  weight: number;
}

export interface ParsedJd {
  responsibilities: string[];
  requirements: string[];
  hardSkills: string[];
  softSkills: string[];
  keywords: KeywordWeight[];
  bonusPoints: string[];
  seniorityLevel: string;
}

/** Extract structured JD data from plain text. */
export function parseJd(text: string): ParsedJd {
  const sections = splitSections(text, JD_SECTIONS);
  const responsibilities =
    bullets(sections.responsibilities ?? "").length > 0
      ? bullets(sections.responsibilities ?? "")
      : bullets(sections._intro ?? "");
  const requirements = bullets(sections.requirements ?? "");
  const bonus = bullets(sections.bonus ?? "");
  const hard = extractHardSkills(text);
  const soft = extractSoftSkills(text);
  const keywordTerms = extractKeywords(text);
  const keywords = keywordTerms.map((term, i) => ({
    term,
    weight: Math.round((1.0 - i * 0.04) * 100) / 100,
  }));
  return {
    responsibilities,
    requirements,
    hardSkills: hard,
    softSkills: soft,
    keywords,
    bonusPoints: bonus,
    seniorityLevel: inferSeniority(text),
  };
}

function inferSeniority(text: string): string {
  const lowered = text.toLowerCase();
  if (["实习", "intern"].some((k) => lowered.includes(k))) return "internship";
  if (["应届", "校招", "graduate", "entry"].some((k) => lowered.includes(k))) return "entry";
  if (["资深", "senior", "高级"].some((k) => lowered.includes(k))) return "senior";
  return "unspecified";
}
