import { apiRequest } from "@/lib/api/client";
import type {
  AuthResult,
  Candidate,
  DiscoveryCreateInput,
  DiscoveryTask,
  JobDetail,
  JobInput,
  JobSummary,
  MatchTask,
  Page,
  Profile,
  ProfileInput,
  Recommendation,
  ReportDetail,
  ReportSummary,
  ResumeDetail,
  ResumeSummary,
  RewriteConfirmResult,
  RewriteTask,
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