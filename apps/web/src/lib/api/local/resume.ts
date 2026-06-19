/** Local-mode resume API: upload, parse, versioning, default, deletion. */
import type { ResumeApi } from "@/lib/api/contract";
import { buildResumeVersionData, recomputeResumeEmbedding } from "@/lib/api/local/compute";
import { getDb } from "@/lib/api/local/db";
import { extractText, validateUpload } from "@/lib/api/local/documents";
import { byCreatedDesc, currentUserId, fail, notFound, nowIso, paginate, uuid } from "@/lib/api/local/helpers";
import { toResumeDetail, toResumeSummary, toResumeVersion } from "@/lib/api/local/mappers";
import type { ResumeRow, ResumeVersionRow } from "@/lib/api/local/rows";
import type { IDBPDatabase } from "idb";
import type { OfferPilotDB } from "@/lib/api/local/db";
import type { ListParams } from "@/lib/api/contract";
import type {
  Page,
  ResumeDetail,
  ResumeSummary,
  ResumeVersion,
  ResumeVersionUpdateInput,
} from "@/lib/api/types";

type DB = IDBPDatabase<OfferPilotDB>;

/** Extract a lowercase file extension (without the dot) from a filename. */
function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

async function latestVersion(db: DB, resumeId: string): Promise<ResumeVersionRow | undefined> {
  const versions = await db.getAllFromIndex("resume_versions", "byResume", resumeId);
  if (!versions.length) return undefined;
  return versions.sort((a, b) => b.versionNo - a.versionNo)[0];
}

async function requireOwned(db: DB, resumeId: string, userId: string): Promise<ResumeRow> {
  const row = await db.get("resumes", resumeId);
  if (!row || row.userId !== userId) notFound("简历不存在。");
  return row;
}

/** Fetch a resume version and verify it belongs to the user (via its resume). */
export async function getOwnedVersion(
  db: DB,
  versionId: string,
  userId: string,
): Promise<ResumeVersionRow> {
  const version = await db.get("resume_versions", versionId);
  if (!version) notFound("简历版本不存在。");
  const resume = await db.get("resumes", version.resumeId);
  if (!resume || resume.userId !== userId) notFound("简历版本不存在。");
  return version;
}

async function clearDefault(db: DB, userId: string): Promise<void> {
  const resumes = await db.getAllFromIndex("resumes", "byUser", userId);
  for (const r of resumes) {
    if (r.isDefault) {
      r.isDefault = false;
      await db.put("resumes", r);
    }
  }
}

export const localResumeApi: ResumeApi = {
  async list(params?: ListParams): Promise<Page<ResumeSummary>> {
    const db = await getDb();
    const userId = await currentUserId();
    const rows = byCreatedDesc(await db.getAllFromIndex("resumes", "byUser", userId));
    return paginate(rows.map(toResumeSummary), params);
  },

  async get(resumeId: string): Promise<ResumeDetail> {
    const db = await getDb();
    const userId = await currentUserId();
    const resume = await requireOwned(db, resumeId, userId);
    return toResumeDetail(resume, await latestVersion(db, resumeId));
  },

  async upload(file: File, title?: string, isDefault = false): Promise<ResumeDetail> {
    validateUpload(file.name, file.size);
    const buffer = await file.arrayBuffer();
    const text = await extractText(file.name, buffer);
    const db = await getDb();
    const userId = await currentUserId();
    const ts = nowIso();
    if (isDefault) await clearDefault(db, userId);

    const resume: ResumeRow = {
      id: uuid(),
      userId,
      title: title || file.name,
      fileName: file.name,
      status: "parsed",
      isDefault,
      createdAt: ts,
      fileType: extensionOf(file.name),
      originalFile: new Blob([buffer], { type: file.type || "application/octet-stream" }),
    };
    await db.put("resumes", resume);

    const data = buildResumeVersionData(text);
    const version: ResumeVersionRow = {
      id: uuid(),
      resumeId: resume.id,
      versionNo: 1,
      sourceReportId: null,
      rawText: text,
      structuredData: data.structuredData,
      skillTags: data.skillTags,
      embedding: data.embedding,
      summary: data.summary,
      createdAt: ts,
    };
    await db.put("resume_versions", version);
    return toResumeDetail(resume, version);
  },

  async setDefault(resumeId: string): Promise<ResumeSummary> {
    const db = await getDb();
    const userId = await currentUserId();
    const resume = await requireOwned(db, resumeId, userId);
    await clearDefault(db, userId);
    resume.isDefault = true;
    await db.put("resumes", resume);
    return toResumeSummary(resume);
  },

  async versions(resumeId: string): Promise<ResumeVersion[]> {
    const db = await getDb();
    const userId = await currentUserId();
    await requireOwned(db, resumeId, userId);
    const rows = await db.getAllFromIndex("resume_versions", "byResume", resumeId);
    return rows.sort((a, b) => b.versionNo - a.versionNo).map(toResumeVersion);
  },

  async update(resumeId: string, input: ResumeVersionUpdateInput): Promise<ResumeDetail> {
    const db = await getDb();
    const userId = await currentUserId();
    const resume = await requireOwned(db, resumeId, userId);
    const version = await latestVersion(db, resumeId);
    if (!version) notFound("简历尚未解析完成。");

    if (input.structuredData !== undefined) version.structuredData = input.structuredData;
    if (input.skillTags !== undefined) version.skillTags = input.skillTags;
    if (input.summary !== undefined) version.summary = input.summary;
    version.embedding = recomputeResumeEmbedding(
      version.structuredData,
      version.skillTags,
      version.summary,
    );
    await db.put("resume_versions", version);
    return toResumeDetail(resume, version);
  },

  async download(resumeId: string): Promise<{ blob: Blob; filename: string }> {
    const db = await getDb();
    const userId = await currentUserId();
    const resume = await requireOwned(db, resumeId, userId);
    if (resume.originalFile) {
      const ext = resume.fileType ? `.${resume.fileType}` : "";
      return {
        blob: resume.originalFile,
        filename: resume.fileName || `${resume.title}${ext}`,
      };
    }
    // Fallback for resumes without a stored original (e.g. the seeded demo
    // resume): serve the parsed raw text as a .txt download.
    const version = await latestVersion(db, resumeId);
    return {
      blob: new Blob([version?.rawText ?? ""], { type: "text/plain;charset=utf-8" }),
      filename: `${resume.title}.txt`,
    };
  },

  async remove(resumeId: string): Promise<void> {
    const db = await getDb();
    const userId = await currentUserId();
    const resume = await requireOwned(db, resumeId, userId);
    if (resume.isSeed) fail("演示简历不可删除。", 403);
    const versions = await db.getAllFromIndex("resume_versions", "byResume", resumeId);
    const tx = db.transaction(["resumes", "resume_versions"], "readwrite");
    await Promise.all(versions.map((v) => tx.objectStore("resume_versions").delete(v.id)));
    await tx.objectStore("resumes").delete(resumeId);
    await tx.done;
  },
};

/** Create a new manual resume version (used by the rewrite confirm flow). */
export async function createManualVersion(
  db: DB,
  userId: string,
  resumeId: string,
  rawText: string,
  sourceReportId: string | null,
  summary: string | null,
): Promise<ResumeVersionRow> {
  await requireOwned(db, resumeId, userId);
  const existing = await db.getAllFromIndex("resume_versions", "byResume", resumeId);
  const nextNo = existing.reduce((max, v) => Math.max(max, v.versionNo), 0) + 1;
  const data = buildResumeVersionData(rawText);
  const version: ResumeVersionRow = {
    id: uuid(),
    resumeId,
    versionNo: nextNo,
    sourceReportId,
    rawText,
    structuredData: data.structuredData,
    skillTags: data.skillTags,
    embedding: data.embedding,
    summary: summary || data.summary,
    createdAt: nowIso(),
  };
  await db.put("resume_versions", version);
  return version;
}

export { latestVersion as latestResumeVersion };
