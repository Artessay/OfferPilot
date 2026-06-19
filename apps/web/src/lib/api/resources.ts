/**
 * Public data-access surface used by every page. Selects the `remote` (HTTP)
 * or `local` (IndexedDB) implementation at build time via `VITE_DATA_MODE`.
 * Pages import `{ authApi, resumeApi, ... }` from here and never care which
 * mode is active.
 */
import type { DataClient } from "@/lib/api/contract";
import { localClient } from "@/lib/api/local";
import * as remote from "@/lib/api/remote";
import { DATA_MODE } from "@/lib/config";

const remoteClient: DataClient = {
  authApi: remote.authApi,
  profileApi: remote.profileApi,
  resumeApi: remote.resumeApi,
  jobApi: remote.jobApi,
  matchApi: remote.matchApi,
  reportApi: remote.reportApi,
  discoveryApi: remote.discoveryApi,
  recommendationApi: remote.recommendationApi,
  rewriteApi: remote.rewriteApi,
  applicationApi: remote.applicationApi,
  adminApi: remote.adminApi,
};

const client: DataClient = DATA_MODE === "local" ? localClient : remoteClient;

export const authApi = client.authApi;
export const profileApi = client.profileApi;
export const resumeApi = client.resumeApi;
export const jobApi = client.jobApi;
export const matchApi = client.matchApi;
export const reportApi = client.reportApi;
export const discoveryApi = client.discoveryApi;
export const recommendationApi = client.recommendationApi;
export const rewriteApi = client.rewriteApi;
export const applicationApi = client.applicationApi;
export const adminApi = client.adminApi;
