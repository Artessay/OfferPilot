/** Local-mode job discovery: source authorization + candidate discovery. */
import { extractHardSkills } from "@/lib/ai/skills";
import type { DiscoveryApi } from "@/lib/api/contract";
import type { OfferPilotDB } from "@/lib/api/local/db";
import { getDb } from "@/lib/api/local/db";
import { byCreatedDesc, currentUserId, notFound, nowIso, uuid } from "@/lib/api/local/helpers";
import { analysisForJob } from "@/lib/api/local/job";
import { toSourceConfig } from "@/lib/api/local/mappers";
import type { JobRow, ResumeVersionRow } from "@/lib/api/local/rows";
import { getOwnedVersion, latestResumeVersion } from "@/lib/api/local/resume";
import type { Candidate, DiscoveryCreateInput, DiscoveryTask, SourceConfig } from "@/lib/api/types";
import type { IDBPDatabase } from "idb";

type DB = IDBPDatabase<OfferPilotDB>;

const DEFAULT_SOURCE_NAME = "平台演示岗位库";

async function ensureDefaultSource(db: DB, userId: string): Promise<void> {
  const sources = await db.getAllFromIndex("source_configs", "byUser", userId);
  if (sources.some((s) => s.sourceName === DEFAULT_SOURCE_NAME)) return;
  await db.put("source_configs", {
    id: uuid(),
    userId,
    sourceType: "admin",
    sourceName: DEFAULT_SOURCE_NAME,
    authStatus: "authorized",
    lastSyncedAt: nowIso(),
  });
}

async function resolveVersion(
  db: DB,
  userId: string,
  versionId?: string,
): Promise<ResumeVersionRow | undefined> {
  if (versionId) return getOwnedVersion(db, versionId, userId);
  const resumes = await db.getAllFromIndex("resumes", "byUser", userId);
  const def = resumes.find((r) => r.isDefault) ?? resumes[0];
  if (!def) return undefined;
  return latestResumeVersion(db, def.id);
}

function discoverJobs(jobs: JobRow[], roles: string[], cities: string[], limit: number): JobRow[] {
  let filtered = jobs;
  if (cities.length) filtered = filtered.filter((j) => j.city && cities.includes(j.city));
  if (roles.length) {
    filtered = filtered.filter((j) =>
      roles.some((r) => r && (j.title.includes(r) || j.jdText.includes(r))),
    );
  }
  // Never return nothing when the user has jobs — fall back to all of them.
  if (!filtered.length) filtered = jobs;
  return filtered.slice(0, limit);
}

function initialReason(title: string, resumeSkills: Set<string>, roles: string[]): string {
  const titleSkills = new Set(extractHardSkills(title));
  const overlap = [...resumeSkills].filter((s) => titleSkills.has(s)).sort();
  if (overlap.length) return `技能匹配：${overlap.join("、")}`;
  const hitRole = roles.find((r) => r && title.includes(r));
  if (hitRole) return `命中目标方向：${hitRole}`;
  return "符合检索条件的候选岗位";
}

export const localDiscoveryApi: DiscoveryApi = {
  async listSources(): Promise<SourceConfig[]> {
    const db = await getDb();
    const userId = await currentUserId();
    await ensureDefaultSource(db, userId);
    const sources = await db.getAllFromIndex("source_configs", "byUser", userId);
    return sources.map(toSourceConfig);
  },

  async createTask(input: DiscoveryCreateInput): Promise<DiscoveryTask> {
    const db = await getDb();
    const userId = await currentUserId();
    await ensureDefaultSource(db, userId);
    const version = await resolveVersion(db, userId, input.resumeVersionId);
    const [profile] = await db.getAllFromIndex("profiles", "byUser", userId);

    const roles = input.filters?.targetRoles?.length
      ? input.filters.targetRoles
      : (profile?.targetRoles ?? []);
    const cities = input.filters?.cities?.length
      ? input.filters.cities
      : (profile?.targetCities ?? []);
    const limit = input.filters?.maxCandidates ?? 10;

    const taskId = uuid();
    const ts = nowIso();
    const allJobs = byCreatedDesc(await db.getAllFromIndex("jobs", "byUser", userId));
    const jobs = discoverJobs(allJobs, roles, cities, limit);
    const resumeSkills = new Set(version?.skillTags ?? []);

    let rank = 0;
    for (const job of jobs) {
      if (!(await analysisForJob(db, job.id))) continue;
      await db.put("discovered_candidates", {
        id: uuid(),
        discoveryTaskId: taskId,
        jobId: job.id,
        sourceRank: rank,
        initialReason: initialReason(job.title, resumeSkills, roles),
        eligibilityStatus: "eligible",
      });
      rank += 1;
    }

    await db.put("discovery_tasks", {
      id: taskId,
      userId,
      resumeVersionId: version?.id ?? null,
      sourceIds: (input.sourceIds ?? []).map(String),
      filters: { targetRoles: roles, cities, maxCandidates: limit },
      status: "succeeded",
      candidateCount: rank,
      createdAt: ts,
    });

    return {
      discoveryTaskId: taskId,
      status: "succeeded",
      candidateCount: rank,
      estimatedSeconds: 0,
      errorCode: null,
    };
  },

  async getTask(taskId: string): Promise<DiscoveryTask> {
    const db = await getDb();
    const userId = await currentUserId();
    const task = await db.get("discovery_tasks", taskId);
    if (!task || task.userId !== userId) notFound("发现任务不存在。");
    return {
      discoveryTaskId: task.id,
      status: task.status,
      candidateCount: task.candidateCount,
      estimatedSeconds: 0,
      errorCode: null,
    };
  },

  async candidates(taskId: string): Promise<Candidate[]> {
    const db = await getDb();
    const userId = await currentUserId();
    const task = await db.get("discovery_tasks", taskId);
    if (!task || task.userId !== userId) notFound("发现任务不存在。");
    const rows = (await db.getAllFromIndex("discovered_candidates", "byTask", taskId)).sort(
      (a, b) => a.sourceRank - b.sourceRank,
    );
    const result: Candidate[] = [];
    for (const c of rows) {
      const job = await db.get("jobs", c.jobId);
      if (!job) continue;
      result.push({
        id: c.id,
        jobId: c.jobId,
        title: job.title,
        company: job.company,
        city: job.city,
        initialReason: c.initialReason,
        eligibilityStatus: c.eligibilityStatus,
      });
    }
    return result;
  },
};

export { discoverJobs };
