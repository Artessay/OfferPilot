/**
 * IndexedDB schema + connection for the local data mode. Object stores mirror
 * the backend entity graph; all rows are keyed by `id` (except `meta`).
 */
import { type DBSchema, type IDBPDatabase, type StoreNames, openDB } from "idb";

import type {
  ApplicationRow,
  DiscoveredCandidateRow,
  DiscoveryTaskRow,
  JobAnalysisRow,
  JobFavoriteRow,
  JobRow,
  MatchReportRow,
  MatchTaskRow,
  MetaRow,
  ProfileRow,
  PromptTemplateRow,
  RecommendationItemRow,
  RecommendationListRow,
  ResumeRow,
  ResumeVersionRow,
  RewriteTaskRow,
  ScoringRuleRow,
  SourceConfigRow,
  SuggestionRow,
  UserRow,
} from "@/lib/api/local/rows";

const DB_NAME = "offerpilot";
const DB_VERSION = 1;

export interface OfferPilotDB extends DBSchema {
  meta: { key: string; value: MetaRow };
  users: { key: string; value: UserRow };
  profiles: { key: string; value: ProfileRow; indexes: { byUser: string } };
  resumes: { key: string; value: ResumeRow; indexes: { byUser: string } };
  resume_versions: { key: string; value: ResumeVersionRow; indexes: { byResume: string } };
  jobs: { key: string; value: JobRow; indexes: { byUser: string } };
  job_analyses: { key: string; value: JobAnalysisRow; indexes: { byJob: string } };
  job_favorites: { key: string; value: JobFavoriteRow; indexes: { byUser: string } };
  match_tasks: { key: string; value: MatchTaskRow; indexes: { byUser: string } };
  match_reports: {
    key: string;
    value: MatchReportRow;
    indexes: { byUser: string; byTask: string };
  };
  suggestions: { key: string; value: SuggestionRow; indexes: { byReport: string } };
  discovery_tasks: { key: string; value: DiscoveryTaskRow; indexes: { byUser: string } };
  discovered_candidates: {
    key: string;
    value: DiscoveredCandidateRow;
    indexes: { byTask: string };
  };
  recommendation_lists: {
    key: string;
    value: RecommendationListRow;
    indexes: { byUser: string };
  };
  recommendation_items: {
    key: string;
    value: RecommendationItemRow;
    indexes: { byList: string };
  };
  rewrite_tasks: { key: string; value: RewriteTaskRow; indexes: { byUser: string } };
  applications: { key: string; value: ApplicationRow; indexes: { byUser: string } };
  source_configs: { key: string; value: SourceConfigRow; indexes: { byUser: string } };
  prompt_templates: { key: string; value: PromptTemplateRow };
  scoring_rules: { key: string; value: ScoringRuleRow };
}

let dbPromise: Promise<IDBPDatabase<OfferPilotDB>> | null = null;

export function getDb(): Promise<IDBPDatabase<OfferPilotDB>> {
  if (!dbPromise) {
    dbPromise = openDB<OfferPilotDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore("meta", { keyPath: "key" });
        db.createObjectStore("users", { keyPath: "id" });

        const profiles = db.createObjectStore("profiles", { keyPath: "id" });
        profiles.createIndex("byUser", "userId");

        const resumes = db.createObjectStore("resumes", { keyPath: "id" });
        resumes.createIndex("byUser", "userId");

        const resumeVersions = db.createObjectStore("resume_versions", { keyPath: "id" });
        resumeVersions.createIndex("byResume", "resumeId");

        const jobs = db.createObjectStore("jobs", { keyPath: "id" });
        jobs.createIndex("byUser", "userId");

        const jobAnalyses = db.createObjectStore("job_analyses", { keyPath: "id" });
        jobAnalyses.createIndex("byJob", "jobId");

        const favorites = db.createObjectStore("job_favorites", { keyPath: "id" });
        favorites.createIndex("byUser", "userId");

        const matchTasks = db.createObjectStore("match_tasks", { keyPath: "id" });
        matchTasks.createIndex("byUser", "userId");

        const reports = db.createObjectStore("match_reports", { keyPath: "id" });
        reports.createIndex("byUser", "userId");
        reports.createIndex("byTask", "matchTaskId");

        const suggestions = db.createObjectStore("suggestions", { keyPath: "id" });
        suggestions.createIndex("byReport", "reportId");

        const discoveryTasks = db.createObjectStore("discovery_tasks", { keyPath: "id" });
        discoveryTasks.createIndex("byUser", "userId");

        const candidates = db.createObjectStore("discovered_candidates", { keyPath: "id" });
        candidates.createIndex("byTask", "discoveryTaskId");

        const recLists = db.createObjectStore("recommendation_lists", { keyPath: "id" });
        recLists.createIndex("byUser", "userId");

        const recItems = db.createObjectStore("recommendation_items", { keyPath: "id" });
        recItems.createIndex("byList", "recommendationListId");

        const rewriteTasks = db.createObjectStore("rewrite_tasks", { keyPath: "id" });
        rewriteTasks.createIndex("byUser", "userId");

        const applications = db.createObjectStore("applications", { keyPath: "id" });
        applications.createIndex("byUser", "userId");

        const sources = db.createObjectStore("source_configs", { keyPath: "id" });
        sources.createIndex("byUser", "userId");

        db.createObjectStore("prompt_templates", { keyPath: "id" });
        db.createObjectStore("scoring_rules", { keyPath: "id" });
      },
    });
  }
  return dbPromise;
}

/** All object store names, used for export/import and clearing. */
export const ALL_STORES: StoreNames<OfferPilotDB>[] = [
  "meta",
  "users",
  "profiles",
  "resumes",
  "resume_versions",
  "jobs",
  "job_analyses",
  "job_favorites",
  "match_tasks",
  "match_reports",
  "suggestions",
  "discovery_tasks",
  "discovered_candidates",
  "recommendation_lists",
  "recommendation_items",
  "rewrite_tasks",
  "applications",
  "source_configs",
  "prompt_templates",
  "scoring_rules",
];
