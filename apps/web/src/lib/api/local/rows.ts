/**
 * Row shapes persisted in IndexedDB for the local (GitHub Pages) data mode.
 * Rows are stored close to the API DTO shape (camelCase) plus a few internal
 * fields the deterministic AI needs (rawText, embedding, weighted keywords).
 */

export interface UserRow {
  id: string;
  email: string | null;
  nickname: string | null;
  role: string; // "student"
  accountType: string; // "local"
  createdAt: string;
}

export interface ProfileRow {
  id: string;
  userId: string;
  educationLevel: string | null;
  school: string | null;
  major: string | null;
  graduationYear: number | null;
  targetRoles: string[];
  targetCities: string[];
  industries: string[];
  skills: string[];
  careerInterests: string[];
  updatedAt: string;
}

export interface ResumeRow {
  id: string;
  userId: string;
  title: string;
  fileName: string | null;
  status: string; // "parsed"
  isDefault: boolean;
  createdAt: string;
}

export interface ResumeVersionRow {
  id: string;
  resumeId: string;
  versionNo: number;
  sourceReportId: string | null;
  rawText: string;
  structuredData: Record<string, unknown>;
  skillTags: string[];
  embedding: number[];
  summary: string | null;
  createdAt: string;
}

export interface JobRow {
  id: string;
  userId: string | null; // null = public/admin job
  title: string;
  company: string | null;
  city: string | null;
  sourceType: string;
  status: string;
  jdText: string;
  createdAt: string;
}

export interface JobAnalysisRow {
  id: string;
  jobId: string;
  responsibilities: string[];
  requirements: string[];
  hardSkills: string[];
  softSkills: string[];
  keywords: { term: string; weight: number }[]; // weighted (used by the scorer)
  bonusPoints: string[];
  seniorityLevel: string | null;
  embedding: number[];
}

export interface JobFavoriteRow {
  id: string;
  userId: string;
  jobId: string;
  createdAt: string;
}

export interface MatchTaskRow {
  id: string;
  userId: string;
  resumeVersionId: string;
  jobId: string;
  status: string;
  progress: number;
  reportId: string | null;
  errorCode: string | null;
  createdAt: string;
}

export interface MatchReportRow {
  id: string;
  userId: string;
  matchTaskId: string;
  jobId: string;
  resumeVersionId: string;
  overallScore: number;
  matchLevel: string;
  dimensionScores: unknown[];
  strengths: unknown[];
  gaps: unknown[];
  risks: unknown[];
  evidence: unknown[];
  summary: string | null;
  scoringVersion: string | null;
  createdAt: string;
}

export interface SuggestionRow {
  id: string;
  reportId: string;
  order: number;
  category: string;
  priority: string;
  problem: string | null;
  reason: string | null;
  suggestion: string | null;
  example: string | null;
  evidenceRefs: string[];
  rewritable: boolean;
  status: string; // "pending"
  createdAt: string;
}

export interface DiscoveryTaskRow {
  id: string;
  userId: string;
  resumeVersionId: string | null;
  sourceIds: string[];
  filters: Record<string, unknown>;
  status: string;
  candidateCount: number;
  createdAt: string;
}

export interface DiscoveredCandidateRow {
  id: string;
  discoveryTaskId: string;
  jobId: string;
  sourceRank: number;
  initialReason: string | null;
  eligibilityStatus: string;
}

export interface RecommendationListRow {
  id: string;
  userId: string;
  discoveryTaskId: string;
  resumeVersionId: string;
  strategy: string;
  summary: string | null;
  createdAt: string;
}

export interface RecommendationItemRow {
  id: string;
  recommendationListId: string;
  jobId: string;
  tier: string;
  matchScore: number;
  successProbability: number;
  opportunityValue: number;
  riskLevel: string;
  tierReason: string;
  suggestedAction: string;
}

export interface RewriteTaskRow {
  id: string;
  userId: string;
  resumeVersionId: string;
  reportId: string;
  suggestionIds: string[];
  status: string;
  diffBlocks: unknown[];
  materialsChecklist: string[];
  newResumeVersionId: string | null;
  createdAt: string;
}

export interface ApplicationRow {
  id: string;
  userId: string;
  jobId: string;
  reportId: string | null;
  status: string;
  appliedAt: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SourceConfigRow {
  id: string;
  userId: string;
  sourceType: string;
  sourceName: string;
  authStatus: string;
  lastSyncedAt: string | null;
}

export interface PromptTemplateRow {
  id: string;
  name: string;
  version: string;
  content: string;
  schemaVersion: string | null;
  isActive: boolean;
  updatedAt: string;
}

export interface ScoringRuleRow {
  id: string;
  name: string;
  version: string;
  weights: Record<string, number>;
  isActive: boolean;
  updatedAt: string;
}

export interface MetaRow {
  key: string;
  value: unknown;
}
