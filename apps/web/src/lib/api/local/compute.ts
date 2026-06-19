/**
 * Bridges the ported AI functions with the persistence layer, mirroring the
 * backend `AIOrchestrator` (embedding sources) plus the resume/job service
 * orchestration. Used by both the seed routine and the resume/job APIs.
 */
import { deterministicEmbedding } from "@/lib/ai/embedding";
import { type ParsedJd, type ParsedResume, parseJd, parseResume } from "@/lib/ai/extraction";

function resumeEmbeddingSource(parsed: ParsedResume): string {
  const sd = parsed.structuredData;
  const parts = [
    parsed.skillTags.join(" "),
    ((sd.experiences as string[]) ?? []).join(" "),
    ((sd.projects as string[]) ?? []).join(" "),
  ];
  return parts.filter(Boolean).join("\n") || parsed.summary;
}

function jobEmbeddingSource(title: string, company: string | null, parsed: ParsedJd): string {
  const parts = [
    title,
    company ?? "",
    parsed.hardSkills.join(" "),
    parsed.requirements.join(" "),
    parsed.responsibilities.join(" "),
  ];
  return parts.filter(Boolean).join("\n");
}

export interface ResumeVersionData {
  structuredData: Record<string, unknown>;
  skillTags: string[];
  summary: string;
  embedding: number[];
}

/** Parse resume text into a persistable version (structured data + embedding). */
export function buildResumeVersionData(text: string): ResumeVersionData {
  const parsed = parseResume(text);
  return { ...parsed, embedding: deterministicEmbedding(resumeEmbeddingSource(parsed)) };
}

export interface JobAnalysisData {
  responsibilities: string[];
  requirements: string[];
  hardSkills: string[];
  softSkills: string[];
  keywords: { term: string; weight: number }[];
  bonusPoints: string[];
  seniorityLevel: string;
  embedding: number[];
}

/** Parse JD text into a persistable analysis (structured fields + embedding). */
export function buildJobAnalysisData(
  title: string,
  company: string | null,
  jdText: string,
): JobAnalysisData {
  const parsed = parseJd(jdText);
  return {
    responsibilities: parsed.responsibilities,
    requirements: parsed.requirements,
    hardSkills: parsed.hardSkills,
    softSkills: parsed.softSkills,
    keywords: parsed.keywords,
    bonusPoints: parsed.bonusPoints,
    seniorityLevel: parsed.seniorityLevel,
    embedding: deterministicEmbedding(jobEmbeddingSource(title, company, parsed)),
  };
}
