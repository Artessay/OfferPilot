/** Local-mode resume rewrite API: draft, fact-check, confirm to a new version. */
import { buildRewriteDrafts, checkFactConsistency, type RewriteSuggestionInput } from "@/lib/ai/rewrite";
import type { RewriteApi } from "@/lib/api/contract";
import { getDb } from "@/lib/api/local/db";
import { currentUserId, fail, notFound, nowIso, uuid } from "@/lib/api/local/helpers";
import { analysisForJob } from "@/lib/api/local/job";
import { createManualVersion, getOwnedVersion } from "@/lib/api/local/resume";
import type { DiffBlock, RewriteConfirmResult, RewriteTask } from "@/lib/api/types";

export const localRewriteApi: RewriteApi = {
  async create(
    resumeVersionId: string,
    reportId: string,
    suggestionIds: string[],
  ): Promise<RewriteTask> {
    const db = await getDb();
    const userId = await currentUserId();
    const version = await getOwnedVersion(db, resumeVersionId, userId);
    const report = await db.get("match_reports", reportId);
    if (!report || report.userId !== userId) notFound("报告不存在。");

    const selected = new Set(suggestionIds);
    const all = await db.getAllFromIndex("suggestions", "byReport", reportId);
    const chosen = all.filter((s) => selected.size === 0 || selected.has(s.id));
    if (!chosen.length) fail("未选择可用于改写的建议。");

    const analysis = await analysisForJob(db, report.jobId);
    const acceptedSuggestions: RewriteSuggestionInput[] = chosen.map((s) => ({
      category: s.category,
      suggestion: s.suggestion,
      reason: s.reason,
      rewritable: s.rewritable,
    }));

    const { diffBlocks, materials } = buildRewriteDrafts({
      originalResumeText: version.rawText,
      resumeSkillTags: version.skillTags,
      acceptedSuggestions,
      jobHardSkills: analysis?.hardSkills ?? [],
    });

    const taskId = uuid();
    await db.put("rewrite_tasks", {
      id: taskId,
      userId,
      resumeVersionId,
      reportId,
      suggestionIds: [...selected],
      status: "drafted",
      diffBlocks,
      materialsChecklist: materials,
      newResumeVersionId: null,
      createdAt: nowIso(),
    });

    return {
      rewriteTaskId: taskId,
      status: "drafted",
      diffBlocks: diffBlocks as DiffBlock[],
      materialsChecklist: materials,
      newResumeVersionId: null,
    };
  },

  async get(rewriteTaskId: string): Promise<RewriteTask> {
    const db = await getDb();
    const userId = await currentUserId();
    const task = await db.get("rewrite_tasks", rewriteTaskId);
    if (!task || task.userId !== userId) notFound("改写任务不存在。");
    return {
      rewriteTaskId: task.id,
      status: task.status,
      diffBlocks: task.diffBlocks as DiffBlock[],
      materialsChecklist: task.materialsChecklist,
      newResumeVersionId: task.newResumeVersionId,
    };
  },

  async confirm(
    rewriteTaskId: string,
    editedContent: string,
    versionSummary?: string,
  ): Promise<RewriteConfirmResult> {
    const db = await getDb();
    const userId = await currentUserId();
    const task = await db.get("rewrite_tasks", rewriteTaskId);
    if (!task || task.userId !== userId) notFound("改写任务不存在。");
    const original = await getOwnedVersion(db, task.resumeVersionId, userId);

    const violations = checkFactConsistency(original.rawText, editedContent);
    if (violations.length) {
      fail(`改写内容包含原简历不存在的事实，请改为手动编辑：${violations.join("；")}`);
    }

    const newVersion = await createManualVersion(
      db,
      userId,
      original.resumeId,
      editedContent,
      task.reportId,
      versionSummary ?? null,
    );
    task.status = "confirmed";
    task.newResumeVersionId = newVersion.id;
    await db.put("rewrite_tasks", task);

    // Mark the chosen suggestions as accepted.
    for (const suggestionId of task.suggestionIds) {
      const suggestion = await db.get("suggestions", suggestionId);
      if (suggestion) {
        suggestion.status = "accepted";
        await db.put("suggestions", suggestion);
      }
    }

    return { newResumeVersionId: newVersion.id, status: "confirmed" };
  },
};
