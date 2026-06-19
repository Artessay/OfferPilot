/**
 * The data-access contract shared by the `remote` (HTTP) and `local`
 * (IndexedDB) implementations. Pages depend only on this surface via
 * `@/lib/api/resources`, so switching `VITE_DATA_MODE` swaps the whole backend
 * with zero changes to feature code.
 */
import type {
  AdminUserSummary,
  ApplicationRecord,
  ApplicationStatus,
  AuthResult,
  Candidate,
  DiscoveryCreateInput,
  DiscoveryTask,
  JobDetail,
  JobImportResult,
  JobInput,
  JobSummary,
  MatchTask,
  Page,
  Profile,
  ProfileInput,
  PromptTemplate,
  Recommendation,
  ReportDetail,
  ReportSummary,
  ResumeDetail,
  ResumeSummary,
  ResumeVersion,
  ResumeVersionUpdateInput,
  RewriteConfirmResult,
  RewriteTask,
  ScoringRule,
  SkillSuggestions,
  SourceConfig,
  Suggestion,
  UserPublic,
} from "@/lib/api/types";

export interface ListParams {
  page?: number;
  pageSize?: number;
}

export interface JobListParams extends ListParams {
  keyword?: string;
  city?: string;
}

export interface ReportListParams extends ListParams {
  jobId?: string;
  resumeVersionId?: string;
}

export interface ApplicationListParams extends ListParams {
  status?: ApplicationStatus;
}

export interface AuthApi {
  register(email: string, password: string, nickname?: string): Promise<AuthResult>;
  login(email: string, password: string): Promise<AuthResult>;
  guest(deviceId?: string): Promise<AuthResult>;
  me(): Promise<UserPublic>;
}

export interface ProfileApi {
  get(): Promise<Profile>;
  update(input: ProfileInput): Promise<Profile>;
  suggestSkills(): Promise<SkillSuggestions>;
}

export interface ResumeApi {
  list(params?: ListParams): Promise<Page<ResumeSummary>>;
  get(resumeId: string): Promise<ResumeDetail>;
  upload(file: File, title?: string, isDefault?: boolean): Promise<ResumeDetail>;
  setDefault(resumeId: string): Promise<ResumeSummary>;
  versions(resumeId: string): Promise<ResumeVersion[]>;
  update(resumeId: string, input: ResumeVersionUpdateInput): Promise<ResumeDetail>;
  download(resumeId: string): Promise<{ blob: Blob; filename: string }>;
  remove(resumeId: string): Promise<void>;
}

export interface JobApi {
  list(params?: JobListParams): Promise<Page<JobSummary>>;
  create(input: JobInput): Promise<JobDetail>;
  get(jobId: string): Promise<JobDetail>;
  import(file: File): Promise<JobImportResult>;
  listFavorites(params?: ListParams): Promise<Page<JobSummary>>;
  addFavorite(jobId: string): Promise<void>;
  removeFavorite(jobId: string): Promise<void>;
}

export interface MatchApi {
  create(resumeVersionId: string, jobId: string, profileId?: string): Promise<MatchTask>;
}

export interface ReportApi {
  list(params?: ReportListParams): Promise<Page<ReportSummary>>;
  get(reportId: string): Promise<ReportDetail>;
  updateSuggestion(suggestionId: string, status: string, note?: string): Promise<Suggestion>;
  export(reportId: string, format: "md" | "json"): Promise<{ blob: Blob; filename: string }>;
}

export interface DiscoveryApi {
  listSources(): Promise<SourceConfig[]>;
  createTask(input: DiscoveryCreateInput): Promise<DiscoveryTask>;
  getTask(taskId: string): Promise<DiscoveryTask>;
  candidates(taskId: string): Promise<Candidate[]>;
}

export interface RecommendationApi {
  createTiered(
    discoveryTaskId: string,
    resumeVersionId?: string,
    strategy?: string,
  ): Promise<Recommendation>;
  get(recommendationId: string): Promise<Recommendation>;
}

export interface RewriteApi {
  create(
    resumeVersionId: string,
    reportId: string,
    suggestionIds: string[],
  ): Promise<RewriteTask>;
  get(rewriteTaskId: string): Promise<RewriteTask>;
  confirm(
    rewriteTaskId: string,
    editedContent: string,
    versionSummary?: string,
  ): Promise<RewriteConfirmResult>;
}

export interface ApplicationCreateInput {
  jobId: string;
  reportId?: string;
  status?: ApplicationStatus;
  note?: string;
}

export interface ApplicationUpdateInput {
  status?: ApplicationStatus;
  note?: string;
  appliedAt?: string;
}

export interface ApplicationApi {
  list(params?: ApplicationListParams): Promise<Page<ApplicationRecord>>;
  create(input: ApplicationCreateInput): Promise<ApplicationRecord>;
  update(recordId: string, input: ApplicationUpdateInput): Promise<ApplicationRecord>;
  remove(recordId: string): Promise<void>;
}

export interface PromptCreateInput {
  name: string;
  version: string;
  content: string;
  schemaVersion?: string;
  isActive?: boolean;
}

export interface RuleCreateInput {
  name: string;
  version: string;
  weights: Record<string, number>;
  isActive?: boolean;
}

export interface AdminApi {
  listPrompts(): Promise<PromptTemplate[]>;
  createPrompt(input: PromptCreateInput): Promise<PromptTemplate>;
  activatePrompt(promptId: string): Promise<PromptTemplate>;
  deletePrompt(promptId: string): Promise<void>;
  listRules(): Promise<ScoringRule[]>;
  createRule(input: RuleCreateInput): Promise<ScoringRule>;
  activateRule(ruleId: string): Promise<ScoringRule>;
  deleteRule(ruleId: string): Promise<void>;
  listJobs(params?: ListParams): Promise<Page<JobSummary>>;
  createJob(input: JobInput): Promise<JobSummary>;
  deleteJob(jobId: string): Promise<void>;
  listUsers(params?: ListParams): Promise<Page<AdminUserSummary>>;
}

export interface DataClient {
  authApi: AuthApi;
  profileApi: ProfileApi;
  resumeApi: ResumeApi;
  jobApi: JobApi;
  matchApi: MatchApi;
  reportApi: ReportApi;
  discoveryApi: DiscoveryApi;
  recommendationApi: RecommendationApi;
  rewriteApi: RewriteApi;
  applicationApi: ApplicationApi;
  adminApi: AdminApi;
}
