/** Local-mode application tracking API. */
import type { ApplicationApi, ApplicationListParams } from "@/lib/api/contract";
import type {
  ApplicationCreateInput,
  ApplicationUpdateInput,
} from "@/lib/api/contract";
import { getDb } from "@/lib/api/local/db";
import { byCreatedDesc, currentUserId, notFound, nowIso, paginate, uuid } from "@/lib/api/local/helpers";
import { toApplicationRecord } from "@/lib/api/local/mappers";
import type { ApplicationRecord, Page } from "@/lib/api/types";

function appliedAtFor(status: string | undefined, current: string | null): string | null {
  if (current) return current;
  if (status && status !== "interested") return nowIso();
  return current;
}

export const localApplicationApi: ApplicationApi = {
  async list(params?: ApplicationListParams): Promise<Page<ApplicationRecord>> {
    const db = await getDb();
    const userId = await currentUserId();
    let rows = byCreatedDesc(await db.getAllFromIndex("applications", "byUser", userId));
    if (params?.status) rows = rows.filter((a) => a.status === params.status);
    const records: ApplicationRecord[] = [];
    for (const row of rows) {
      const job = await db.get("jobs", row.jobId);
      records.push(toApplicationRecord(row, job));
    }
    return paginate(records, params);
  },

  async create(input: ApplicationCreateInput): Promise<ApplicationRecord> {
    const db = await getDb();
    const userId = await currentUserId();
    const job = await db.get("jobs", input.jobId);
    if (!job || (job.userId !== null && job.userId !== userId)) notFound("岗位不存在。");
    const status = input.status ?? "interested";
    const ts = nowIso();
    const row = {
      id: uuid(),
      userId,
      jobId: input.jobId,
      reportId: input.reportId ?? null,
      status,
      appliedAt: appliedAtFor(status, null),
      note: input.note ?? null,
      createdAt: ts,
      updatedAt: ts,
    };
    await db.put("applications", row);
    return toApplicationRecord(row, job);
  },

  async update(recordId: string, input: ApplicationUpdateInput): Promise<ApplicationRecord> {
    const db = await getDb();
    const userId = await currentUserId();
    const row = await db.get("applications", recordId);
    if (!row || row.userId !== userId) notFound("投递记录不存在。");
    if (input.status !== undefined) row.status = input.status;
    if (input.note !== undefined) row.note = input.note;
    if (input.appliedAt !== undefined) row.appliedAt = input.appliedAt;
    else row.appliedAt = appliedAtFor(input.status, row.appliedAt);
    row.updatedAt = nowIso();
    await db.put("applications", row);
    const job = await db.get("jobs", row.jobId);
    return toApplicationRecord(row, job);
  },

  async remove(recordId: string): Promise<void> {
    const db = await getDb();
    const userId = await currentUserId();
    const row = await db.get("applications", recordId);
    if (!row || row.userId !== userId) notFound("投递记录不存在。");
    await db.delete("applications", recordId);
  },
};
