/** Local-mode report API: list, detail, suggestion status, export. */
import type { ListParams, ReportApi, ReportListParams } from "@/lib/api/contract";
import type { OfferPilotDB } from "@/lib/api/local/db";
import { getDb } from "@/lib/api/local/db";
import { renderReportMarkdown } from "@/lib/api/local/export-report";
import { byCreatedDesc, currentUserId, notFound, paginate } from "@/lib/api/local/helpers";
import { toReportDetail, toReportSummary, toSuggestion } from "@/lib/api/local/mappers";
import type { Page, ReportDetail, ReportSummary, Suggestion } from "@/lib/api/types";
import type { IDBPDatabase } from "idb";

type DB = IDBPDatabase<OfferPilotDB>;

export async function getReportDetail(
  db: DB,
  userId: string,
  reportId: string,
): Promise<ReportDetail> {
  const report = await db.get("match_reports", reportId);
  if (!report || report.userId !== userId) notFound("报告不存在。");
  const job = await db.get("jobs", report.jobId);
  if (!job) notFound("报告关联的岗位不存在。");
  const suggestions = (await db.getAllFromIndex("suggestions", "byReport", reportId)).sort(
    (a, b) => a.order - b.order,
  );
  return toReportDetail(report, job, suggestions);
}

export const localReportApi: ReportApi = {
  async list(params?: ReportListParams): Promise<Page<ReportSummary>> {
    const db = await getDb();
    const userId = await currentUserId();
    let rows = byCreatedDesc(await db.getAllFromIndex("match_reports", "byUser", userId));
    if (params?.jobId) rows = rows.filter((r) => r.jobId === params.jobId);
    if (params?.resumeVersionId) {
      rows = rows.filter((r) => r.resumeVersionId === params.resumeVersionId);
    }
    return paginate(rows.map(toReportSummary), params as ListParams);
  },

  async get(reportId: string): Promise<ReportDetail> {
    const db = await getDb();
    const userId = await currentUserId();
    return getReportDetail(db, userId, reportId);
  },

  async updateSuggestion(suggestionId: string, status: string): Promise<Suggestion> {
    const db = await getDb();
    const userId = await currentUserId();
    const suggestion = await db.get("suggestions", suggestionId);
    if (!suggestion) notFound("建议不存在。");
    const report = await db.get("match_reports", suggestion.reportId);
    if (!report || report.userId !== userId) notFound("建议不存在。");
    suggestion.status = status;
    await db.put("suggestions", suggestion);
    return toSuggestion(suggestion);
  },

  async export(reportId: string, format: "md" | "json"): Promise<{ blob: Blob; filename: string }> {
    const db = await getDb();
    const userId = await currentUserId();
    const detail = await getReportDetail(db, userId, reportId);
    const shortId = detail.id.slice(0, 8);
    if (format === "json") {
      const blob = new Blob([JSON.stringify(detail, null, 2)], { type: "application/json" });
      return { blob, filename: `report-${shortId}.json` };
    }
    const blob = new Blob([renderReportMarkdown(detail)], { type: "text/markdown" });
    return { blob, filename: `report-${shortId}.md` };
  },
};
