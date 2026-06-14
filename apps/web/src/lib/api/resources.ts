import { apiDownload, apiRequest } from "@/lib/api/client";
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
  RewriteConfirmResult,
  RewriteTask,
  ScoringRule,
  SkillSuggestions,
  SourceConfig,
  Suggestion,
} from "@/lib/api/types";

type ListParams = {
  page?: number;
  pageSize?: number;
};

type JobListParams = ListParams & {
  keyword?: string;
  city?: string;
};

type ReportListParams = ListParams & {
  jobId?: string;
  resumeVersionId?: string;
};

const id = (value: string) => encodeURIComponent(value);

export const authApi = {
  register(email: string, password: string, nickname?: string) {
    return apiRequest<AuthResult>("/auth/register", {
      method: "POST",
      auth: false,
      body: { email, password, nickname },
    });
  },

  login(email: string, password: string) {
    return apiRequest<AuthResult>("/auth/login", {
      method: "POST",
      auth: false,
      body: { email, password },
    });
  },

  guest(deviceId?: string) {
    return apiRequest<AuthResult>("/auth/guest", {
      method: "POST",
      auth: false,
      body: { deviceId },
    });
  },

  me() {
    return apiRequest<AuthResult["user"]>("/users/me");
  },
};

export const profileApi = {
  get() {
    return apiRequest<Profile>("/profile");
  },

  update(input: ProfileInput) {
    return apiRequest<Profile>("/profile", { method: "PUT", body: input });
  },

  suggestSkills() {
    return apiRequest<SkillSuggestions>("/profile/skills");
  },
};

export const resumeApi = {
  list(params?: ListParams) {
    return apiRequest<Page<ResumeSummary>>("/resumes", { query: params });
  },

  get(resumeId: string) {
    return apiRequest<ResumeDetail>(`/resumes/${id(resumeId)}`);
  },

  upload(file: File, title?: string, isDefault = false) {
    const form = new FormData();
    form.append("file", file);
    if (title) form.append("title", title);
    form.append("isDefault", String(isDefault));
    return apiRequest<ResumeDetail>("/resumes", { method: "POST", body: form });
  },

  setDefault(resumeId: string) {
    return apiRequest<ResumeSummary>(`/resumes/${id(resumeId)}/default`, { method: "POST" });
  },

  versions(resumeId: string) {
    return apiRequest<ResumeVersion[]>(`/resumes/${id(resumeId)}/versions`);
  },

  remove(resumeId: string) {
    return apiRequest<void>(`/resumes/${id(resumeId)}`, { method: "DELETE" });
  },
};

export const jobApi = {
  list(params?: JobListParams) {
    return apiRequest<Page<JobSummary>>("/jobs", { query: params });
  },

  create(input: JobInput) {
    return apiRequest<JobDetail>("/jobs", { method: "POST", body: input });
  },

  get(jobId: string) {
    return apiRequest<JobDetail>(`/jobs/${id(jobId)}`);
  },

  import(file: File) {
    const form = new FormData();
    form.append("file", file);
    return apiRequest<JobImportResult>("/jobs/import", { method: "POST", body: form });
  },

  listFavorites(params?: ListParams) {
    return apiRequest<Page<JobSummary>>("/jobs/favorites", { query: params });
  },

  addFavorite(jobId: string) {
    return apiRequest<void>(`/jobs/${id(jobId)}/favorite`, { method: "POST" });
  },

  removeFavorite(jobId: string) {
    return apiRequest<void>(`/jobs/${id(jobId)}/favorite`, { method: "DELETE" });
  },
};

export const matchApi = {
  create(resumeVersionId: string, jobId: string, profileId?: string) {
    return apiRequest<MatchTask>("/matches", {
      method: "POST",
      body: { resumeVersionId, jobId, profileId },
    });
  },
};

export const reportApi = {
  list(params?: ReportListParams) {
    return apiRequest<Page<ReportSummary>>("/reports", { query: params });
  },

  get(reportId: string) {
    return apiRequest<ReportDetail>(`/reports/${id(reportId)}`);
  },

  updateSuggestion(suggestionId: string, status: string, note?: string) {
    return apiRequest<Suggestion>(`/suggestions/${id(suggestionId)}`, {
      method: "PATCH",
      body: { status, note },
    });
  },

  export(reportId: string, format: "md" | "json") {
    return apiDownload(`/reports/${id(reportId)}/export`, { query: { format } });
  },
};

export const discoveryApi = {
  listSources() {
    return apiRequest<SourceConfig[]>("/job-sources");
  },

  createTask(input: DiscoveryCreateInput) {
    return apiRequest<DiscoveryTask>("/job-discovery/tasks", { method: "POST", body: input });
  },

  getTask(taskId: string) {
    return apiRequest<DiscoveryTask>(`/job-discovery/tasks/${id(taskId)}`);
  },

  candidates(taskId: string) {
    return apiRequest<Candidate[]>(`/job-discovery/tasks/${id(taskId)}/candidates`);
  },
};

export const recommendationApi = {
  createTiered(discoveryTaskId: string, resumeVersionId?: string, strategy = "balanced") {
    return apiRequest<Recommendation>("/recommendations/tiered", {
      method: "POST",
      body: { discoveryTaskId, resumeVersionId, strategy },
    });
  },

  get(recommendationId: string) {
    return apiRequest<Recommendation>(`/recommendations/${id(recommendationId)}`);
  },
};

export const rewriteApi = {
  create(resumeVersionId: string, reportId: string, suggestionIds: string[]) {
    return apiRequest<RewriteTask>("/resume-rewrites", {
      method: "POST",
      body: { resumeVersionId, reportId, suggestionIds },
    });
  },

  get(rewriteTaskId: string) {
    return apiRequest<RewriteTask>(`/resume-rewrites/${id(rewriteTaskId)}`);
  },

  confirm(rewriteTaskId: string, editedContent: string, versionSummary?: string) {
    return apiRequest<RewriteConfirmResult>(`/resume-rewrites/${id(rewriteTaskId)}/confirm`, {
      method: "POST",
      body: { editedContent, versionSummary },
    });
  },
};

type ApplicationListParams = ListParams & {
  status?: ApplicationStatus;
};

export const applicationApi = {
  list(params?: ApplicationListParams) {
    return apiRequest<Page<ApplicationRecord>>("/applications", { query: params });
  },

  create(input: {
    jobId: string;
    reportId?: string;
    status?: ApplicationStatus;
    note?: string;
  }) {
    return apiRequest<ApplicationRecord>("/applications", { method: "POST", body: input });
  },

  update(
    recordId: string,
    input: { status?: ApplicationStatus; note?: string; appliedAt?: string },
  ) {
    return apiRequest<ApplicationRecord>(`/applications/${id(recordId)}`, {
      method: "PATCH",
      body: input,
    });
  },

  remove(recordId: string) {
    return apiRequest<void>(`/applications/${id(recordId)}`, { method: "DELETE" });
  },
};

export const adminApi = {
  listPrompts() {
    return apiRequest<PromptTemplate[]>("/admin/prompts");
  },
  createPrompt(input: {
    name: string;
    version: string;
    content: string;
    schemaVersion?: string;
    isActive?: boolean;
  }) {
    return apiRequest<PromptTemplate>("/admin/prompts", { method: "POST", body: input });
  },
  activatePrompt(promptId: string) {
    return apiRequest<PromptTemplate>(`/admin/prompts/${id(promptId)}/activate`, {
      method: "POST",
    });
  },
  deletePrompt(promptId: string) {
    return apiRequest<void>(`/admin/prompts/${id(promptId)}`, { method: "DELETE" });
  },

  listRules() {
    return apiRequest<ScoringRule[]>("/admin/scoring-rules");
  },
  createRule(input: {
    name: string;
    version: string;
    weights: Record<string, number>;
    isActive?: boolean;
  }) {
    return apiRequest<ScoringRule>("/admin/scoring-rules", { method: "POST", body: input });
  },
  activateRule(ruleId: string) {
    return apiRequest<ScoringRule>(`/admin/scoring-rules/${id(ruleId)}/activate`, {
      method: "POST",
    });
  },
  deleteRule(ruleId: string) {
    return apiRequest<void>(`/admin/scoring-rules/${id(ruleId)}`, { method: "DELETE" });
  },

  listJobs(params?: ListParams) {
    return apiRequest<Page<JobSummary>>("/admin/jobs", { query: params });
  },
  createJob(input: JobInput) {
    return apiRequest<JobSummary>("/admin/jobs", { method: "POST", body: input });
  },
  deleteJob(jobId: string) {
    return apiRequest<void>(`/admin/jobs/${id(jobId)}`, { method: "DELETE" });
  },

  listUsers(params?: ListParams) {
    return apiRequest<Page<AdminUserSummary>>("/admin/users", { query: params });
  },
};