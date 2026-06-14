export type ID = string;

export interface Envelope<T> {
  data: T;
  requestId: string;
  timestamp: string;
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Page<T> {
  items: T[];
  meta: PageMeta;
}

export interface UserPublic {
  id: ID;
  email: string | null;
  nickname: string | null;
  role: string;
  accountType: string;
  createdAt: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
}

export interface AuthResult {
  user: UserPublic;
  tokens: TokenPair;
}

export interface ProfileInput {
  educationLevel?: string;
  school?: string;
  major?: string;
  graduationYear?: number;
  targetRoles?: string[];
  targetCities?: string[];
  industries?: string[];
  skills?: string[];
  careerInterests?: string[];
}

export interface Profile {
  id: ID;
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

export interface SkillSuggestions {
  skills: string[];
}

export interface ResumeVersion {
  id: ID;
  versionNo: number;
  sourceReportId: ID | null;
  structuredData: Record<string, unknown>;
  skillTags: string[];
  summary: string | null;
  createdAt: string;
}

export interface ResumeSummary {
  id: ID;
  title: string;
  fileName: string | null;
  status: string;
  isDefault: boolean;
  createdAt: string;
}

export interface ResumeDetail extends ResumeSummary {
  latestVersion: ResumeVersion | null;
}

export interface JobInput {
  title: string;
  company?: string;
  city?: string;
  sourceType?: string;
  sourceUrl?: string;
  jdText: string;
}

export interface JobAnalysis {
  id: ID;
  responsibilities: string[];
  requirements: string[];
  hardSkills: string[];
  softSkills: string[];
  keywords: string[];
  bonusPoints: string[];
  seniorityLevel: string | null;
}

export interface JobSummary {
  id: ID;
  title: string;
  company: string | null;
  city: string | null;
  sourceType: string;
  status: string;
  createdAt: string;
}

export interface JobDetail extends JobSummary {
  jdText: string;
  analysis: JobAnalysis | null;
  isFavorite: boolean;
}

export interface MatchTask {
  matchTaskId: ID;
  status: string;
  progress: number;
  estimatedSeconds: number;
  reportId: ID | null;
  errorCode: string | null;
}

export interface JobRef {
  jobId: ID;
  title: string;
  company: string | null;
}

export interface Suggestion {
  id: ID;
  category: string;
  priority: string;
  problem: string | null;
  reason: string | null;
  suggestion: string | null;
  example: string | null;
  evidenceRefs: string[];
  rewritable: boolean;
  status: string;
}

export interface ReportSummary {
  id: ID;
  jobId: ID;
  resumeVersionId: ID;
  overallScore: number;
  matchLevel: string;
  summary: string | null;
  createdAt: string;
}

export interface DimensionScore {
  code: string;
  name: string;
  score: number;
  weight: number;
}

export interface EvidenceItem {
  id: string;
  type: string;
  text: string;
}

export interface GapItem {
  severity: string;
  description: string;
}

export interface ReportInsight {
  title?: string;
  description?: string;
  [key: string]: unknown;
}

export interface ReportDetail {
  id: ID;
  job: JobRef;
  resumeVersionId: ID;
  overallScore: number;
  matchLevel: string;
  dimensionScores: DimensionScore[];
  strengths: ReportInsight[];
  gaps: GapItem[];
  risks: ReportInsight[];
  evidence: EvidenceItem[];
  summary: string | null;
  suggestions: Suggestion[];
  scoringVersion: string | null;
  createdAt: string;
}

export interface DiffBlock {
  section: string;
  original: string;
  rewritten: string;
  reason: string;
  riskWarning: string;
}

export interface RewriteTask {
  rewriteTaskId: ID;
  status: string;
  diffBlocks: DiffBlock[];
  materialsChecklist: string[];
  newResumeVersionId: ID | null;
}

export interface RewriteConfirmResult {
  newResumeVersionId: ID;
  status: string;
}

export interface DiscoveryFilters {
  targetRoles?: string[];
  cities?: string[];
  jobType?: string | null;
  maxCandidates?: number;
}

export interface DiscoveryCreateInput {
  profileId?: ID;
  resumeVersionId?: ID;
  sourceIds?: ID[];
  filters?: DiscoveryFilters;
}

export interface DiscoveryTask {
  discoveryTaskId: ID;
  status: string;
  candidateCount: number;
  estimatedSeconds: number;
  errorCode: string | null;
}

export interface Candidate {
  id: ID;
  jobId: ID;
  title: string;
  company: string | null;
  city: string | null;
  initialReason: string | null;
  eligibilityStatus: string;
}

export interface SourceConfig {
  id: ID;
  sourceType: string;
  sourceName: string;
  authStatus: string;
  lastSyncedAt: string | null;
}

export interface TierItem {
  jobId: ID;
  title: string;
  company: string | null;
  matchScore: number;
  successProbability: number;
  opportunityValue: number;
  riskLevel: string;
  tierReason: string;
  suggestedAction: string;
}

export interface TierGroup {
  tier: string;
  name: string;
  items: TierItem[];
}

export interface Recommendation {
  recommendationId: ID;
  strategy: string;
  summary: string | null;
  tiers: TierGroup[];
}

// --- Application tracking ---
export type ApplicationStatus =
  | "interested"
  | "applied"
  | "written_test"
  | "interview"
  | "offer"
  | "rejected"
  | "closed";

export interface ApplicationRecord {
  id: ID;
  job: { jobId: ID; title: string; company: string | null; city: string | null };
  reportId: ID | null;
  status: ApplicationStatus;
  appliedAt: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

// --- Job bulk import ---
export interface JobImportResult {
  createdCount: number;
  items: JobSummary[];
  errors: string[];
}

// --- Admin ---
export interface PromptTemplate {
  id: ID;
  name: string;
  version: string;
  content: string;
  schemaVersion: string | null;
  isActive: boolean;
  updatedAt: string;
}

export interface ScoringRule {
  id: ID;
  name: string;
  version: string;
  weights: Record<string, number>;
  isActive: boolean;
  updatedAt: string;
}

export interface AdminUserSummary {
  id: ID;
  email: string | null;
  nickname: string | null;
  role: string;
  accountType: string;
  createdAt: string;
}