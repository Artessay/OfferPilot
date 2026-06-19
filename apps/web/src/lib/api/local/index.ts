/** Assembles the local (IndexedDB-backed) implementation of the DataClient. */
import type { DataClient } from "@/lib/api/contract";
import { localAdminApi } from "@/lib/api/local/admin";
import { localApplicationApi } from "@/lib/api/local/application";
import { localAuthApi } from "@/lib/api/local/auth";
import { localDiscoveryApi } from "@/lib/api/local/discovery";
import { localJobApi } from "@/lib/api/local/job";
import { localMatchApi } from "@/lib/api/local/match";
import { localProfileApi } from "@/lib/api/local/profile";
import { localRecommendationApi } from "@/lib/api/local/recommendation";
import { localReportApi } from "@/lib/api/local/report";
import { localResumeApi } from "@/lib/api/local/resume";
import { localRewriteApi } from "@/lib/api/local/rewrite";

export const localClient: DataClient = {
  authApi: localAuthApi,
  profileApi: localProfileApi,
  resumeApi: localResumeApi,
  jobApi: localJobApi,
  matchApi: localMatchApi,
  reportApi: localReportApi,
  discoveryApi: localDiscoveryApi,
  recommendationApi: localRecommendationApi,
  rewriteApi: localRewriteApi,
  applicationApi: localApplicationApi,
  adminApi: localAdminApi,
};
