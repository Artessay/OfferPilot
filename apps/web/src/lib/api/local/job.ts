/** Local-mode job API: create, parse JD, bulk import, search, favorites. */
import type { JobApi, JobListParams, ListParams } from "@/lib/api/contract";
import { buildJobAnalysisData } from "@/lib/api/local/compute";
import type { OfferPilotDB } from "@/lib/api/local/db";
import { getDb } from "@/lib/api/local/db";
import { normalizeText, parseJobsFromFile } from "@/lib/api/local/documents";
import {
  byCreatedDesc,
  currentUserId,
  fail,
  notFound,
  nowIso,
  paginate,
  uuid,
} from "@/lib/api/local/helpers";
import { toJobDetail, toJobSummary } from "@/lib/api/local/mappers";
import type { JobAnalysisRow, JobRow } from "@/lib/api/local/rows";
import type { JobDetail, JobImportResult, JobInput, JobSummary, Page } from "@/lib/api/types";
import type { IDBPDatabase } from "idb";

type DB = IDBPDatabase<OfferPilotDB>;

const MIN_JD_LENGTH = 40;

async function analysisForJob(db: DB, jobId: string): Promise<JobAnalysisRow | undefined> {
  const [analysis] = await db.getAllFromIndex("job_analyses", "byJob", jobId);
  return analysis;
}

async function isFavorite(db: DB, userId: string, jobId: string): Promise<boolean> {
  const favorites = await db.getAllFromIndex("job_favorites", "byUser", userId);
  return favorites.some((f) => f.jobId === jobId);
}

async function visibleJob(db: DB, jobId: string, userId: string): Promise<JobRow | undefined> {
  const job = await db.get("jobs", jobId);
  if (!job) return undefined;
  if (job.userId === null || job.userId === userId) return job;
  return undefined;
}

async function storeAnalysis(
  db: DB,
  jobId: string,
  title: string,
  company: string | null,
  jdText: string,
): Promise<void> {
  const existing = await db.getAllFromIndex("job_analyses", "byJob", jobId);
  for (const a of existing) await db.delete("job_analyses", a.id);
  const data = buildJobAnalysisData(title, company, jdText);
  await db.put("job_analyses", { id: uuid(), jobId, ...data });
}

async function createJobRow(
  db: DB,
  userId: string,
  fields: { title: string; company: string | null; city: string | null; sourceType: string; jdText: string },
): Promise<JobRow> {
  const job: JobRow = {
    id: uuid(),
    userId,
    title: fields.title,
    company: fields.company,
    city: fields.city,
    sourceType: fields.sourceType,
    status: "parsed",
    jdText: fields.jdText,
    createdAt: nowIso(),
  };
  await db.put("jobs", job);
  await storeAnalysis(db, job.id, job.title, job.company, job.jdText);
  return job;
}

export const localJobApi: JobApi = {
  async list(params?: JobListParams): Promise<Page<JobSummary>> {
    const db = await getDb();
    const userId = await currentUserId();
    let rows = byCreatedDesc(await db.getAllFromIndex("jobs", "byUser", userId));
    const keyword = params?.keyword?.trim().toLowerCase();
    if (keyword) {
      rows = rows.filter((j) =>
        [j.title, j.company ?? "", j.jdText].some((t) => t.toLowerCase().includes(keyword)),
      );
    }
    if (params?.city) {
      const city = params.city.trim();
      rows = rows.filter((j) => (j.city ?? "").includes(city));
    }
    return paginate(rows.map(toJobSummary), params);
  },

  async create(input: JobInput): Promise<JobDetail> {
    const jdText = normalizeText(input.jdText);
    if (jdText.length < MIN_JD_LENGTH) fail("岗位描述过短，请提供更完整的 JD（至少 40 字）。");
    const db = await getDb();
    const userId = await currentUserId();
    const job = await createJobRow(db, userId, {
      title: input.title,
      company: input.company ?? null,
      city: input.city ?? null,
      sourceType: input.sourceType ?? "manual",
      jdText,
    });
    return toJobDetail(job, await analysisForJob(db, job.id), false);
  },

  async get(jobId: string): Promise<JobDetail> {
    const db = await getDb();
    const userId = await currentUserId();
    const job = await visibleJob(db, jobId, userId);
    if (!job) notFound("岗位不存在。");
    return toJobDetail(job, await analysisForJob(db, jobId), await isFavorite(db, userId, jobId));
  },

  async import(file: File): Promise<JobImportResult> {
    const parsed = await parseJobsFromFile(file.name, await file.arrayBuffer());
    const db = await getDb();
    const userId = await currentUserId();
    const items: JobSummary[] = [];
    const errors = [...parsed.errors];
    for (const item of parsed.jobs) {
      const jdText = normalizeText(item.jdText);
      if (jdText.length < MIN_JD_LENGTH) {
        errors.push(`「${item.title}」岗位描述过短，已跳过。`);
        continue;
      }
      try {
        const job = await createJobRow(db, userId, {
          title: item.title,
          company: item.company,
          city: item.city,
          sourceType: "file",
          jdText,
        });
        items.push(toJobSummary(job));
      } catch {
        errors.push(`「${item.title}」解析失败，已跳过。`);
      }
    }
    return { createdCount: items.length, items, errors };
  },

  async listFavorites(params?: ListParams): Promise<Page<JobSummary>> {
    const db = await getDb();
    const userId = await currentUserId();
    const favorites = byCreatedDesc(await db.getAllFromIndex("job_favorites", "byUser", userId));
    const jobs: JobSummary[] = [];
    for (const fav of favorites) {
      const job = await db.get("jobs", fav.jobId);
      if (job) jobs.push(toJobSummary(job));
    }
    return paginate(jobs, params);
  },

  async addFavorite(jobId: string): Promise<void> {
    const db = await getDb();
    const userId = await currentUserId();
    const job = await visibleJob(db, jobId, userId);
    if (!job) notFound("岗位不存在。");
    if (!(await isFavorite(db, userId, jobId))) {
      await db.put("job_favorites", { id: uuid(), userId, jobId, createdAt: nowIso() });
    }
  },

  async removeFavorite(jobId: string): Promise<void> {
    const db = await getDb();
    const userId = await currentUserId();
    const favorites = await db.getAllFromIndex("job_favorites", "byUser", userId);
    const existing = favorites.find((f) => f.jobId === jobId);
    if (existing) await db.delete("job_favorites", existing.id);
  },
};

export { analysisForJob, visibleJob };
