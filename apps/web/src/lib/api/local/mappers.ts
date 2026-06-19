/** Convert IndexedDB rows into the camelCase API DTOs the frontend expects. */
import type {
  ApplicationRecord,
  ApplicationStatus,
  DimensionScore,
  EvidenceItem,
  GapItem,
  JobAnalysis,
  JobDetail,
  JobSummary,
  Profile,
  ReportDetail,
  ReportInsight,
  ReportSummary,
  ResumeDetail,
  ResumeSummary,
  ResumeVersion,
  SourceConfig,
  Suggestion,
  UserPublic,
} from "@/lib/api/types";

import type {
  ApplicationRow,
  JobAnalysisRow,
  JobRow,
  MatchReportRow,
  ProfileRow,
  ResumeRow,
  ResumeVersionRow,
  SourceConfigRow,
  SuggestionRow,
  UserRow,
} from "@/lib/api/local/rows";

export function toUserPublic(u: UserRow): UserPublic {
  return {
    id: u.id,
    email: u.email,
    nickname: u.nickname,
    role: u.role,
    accountType: u.accountType,
    createdAt: u.createdAt,
  };
}

export function toProfile(p: ProfileRow): Profile {
  return {
    id: p.id,
    educationLevel: p.educationLevel,
    school: p.school,
    major: p.major,
    graduationYear: p.graduationYear,
    targetRoles: p.targetRoles,
    targetCities: p.targetCities,
    industries: p.industries,
    skills: p.skills,
    careerInterests: p.careerInterests,
    updatedAt: p.updatedAt,
  };
}

export function toResumeSummary(r: ResumeRow): ResumeSummary {
  return {
    id: r.id,
    title: r.title,
    fileName: r.fileName,
    status: r.status,
    isDefault: r.isDefault,
    createdAt: r.createdAt,
  };
}

export function toResumeVersion(v: ResumeVersionRow): ResumeVersion {
  return {
    id: v.id,
    versionNo: v.versionNo,
    sourceReportId: v.sourceReportId,
    structuredData: v.structuredData,
    skillTags: v.skillTags,
    summary: v.summary,
    createdAt: v.createdAt,
  };
}

export function toResumeDetail(r: ResumeRow, latest: ResumeVersionRow | undefined): ResumeDetail {
  return { ...toResumeSummary(r), latestVersion: latest ? toResumeVersion(latest) : null };
}

export function toJobSummary(j: JobRow): JobSummary {
  return {
    id: j.id,
    title: j.title,
    company: j.company,
    city: j.city,
    sourceType: j.sourceType,
    status: j.status,
    createdAt: j.createdAt,
  };
}

export function toJobAnalysis(a: JobAnalysisRow): JobAnalysis {
  return {
    id: a.id,
    responsibilities: a.responsibilities,
    requirements: a.requirements,
    hardSkills: a.hardSkills,
    softSkills: a.softSkills,
    keywords: a.keywords.map((k) => k.term),
    bonusPoints: a.bonusPoints,
    seniorityLevel: a.seniorityLevel,
  };
}

export function toJobDetail(
  j: JobRow,
  a: JobAnalysisRow | undefined,
  isFavorite: boolean,
): JobDetail {
  return {
    ...toJobSummary(j),
    jdText: j.jdText,
    analysis: a ? toJobAnalysis(a) : null,
    isFavorite,
  };
}

export function toSuggestion(s: SuggestionRow): Suggestion {
  return {
    id: s.id,
    category: s.category,
    priority: s.priority,
    problem: s.problem,
    reason: s.reason,
    suggestion: s.suggestion,
    example: s.example,
    evidenceRefs: s.evidenceRefs,
    rewritable: s.rewritable,
    status: s.status,
  };
}

export function toReportSummary(r: MatchReportRow): ReportSummary {
  return {
    id: r.id,
    jobId: r.jobId,
    resumeVersionId: r.resumeVersionId,
    overallScore: r.overallScore,
    matchLevel: r.matchLevel,
    summary: r.summary,
    createdAt: r.createdAt,
  };
}

export function toReportDetail(
  r: MatchReportRow,
  job: JobRow,
  suggestions: SuggestionRow[],
): ReportDetail {
  return {
    id: r.id,
    job: { jobId: job.id, title: job.title, company: job.company },
    resumeVersionId: r.resumeVersionId,
    overallScore: r.overallScore,
    matchLevel: r.matchLevel,
    dimensionScores: r.dimensionScores as DimensionScore[],
    strengths: r.strengths as ReportInsight[],
    gaps: r.gaps as GapItem[],
    risks: r.risks as ReportInsight[],
    evidence: r.evidence as EvidenceItem[],
    summary: r.summary,
    suggestions: suggestions.map(toSuggestion),
    scoringVersion: r.scoringVersion,
    createdAt: r.createdAt,
  };
}

export function toApplicationRecord(a: ApplicationRow, job: JobRow | undefined): ApplicationRecord {
  return {
    id: a.id,
    job: {
      jobId: a.jobId,
      title: job?.title ?? "未知岗位",
      company: job?.company ?? null,
      city: job?.city ?? null,
    },
    reportId: a.reportId,
    status: a.status as ApplicationStatus,
    appliedAt: a.appliedAt,
    note: a.note,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

export function toSourceConfig(s: SourceConfigRow): SourceConfig {
  return {
    id: s.id,
    sourceType: s.sourceType,
    sourceName: s.sourceName,
    authStatus: s.authStatus,
    lastSyncedAt: s.lastSyncedAt,
  };
}
