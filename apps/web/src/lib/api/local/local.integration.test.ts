/**
 * End-to-end test of the local (IndexedDB) DataClient using a fake IndexedDB.
 * Exercises the full surface a user touches in the GitHub Pages build:
 * provisioning + seed, resumes, jobs, matching, reports, discovery,
 * recommendations, rewrite (incl. the fact-safety guard), applications, and
 * the backup export/clear/import round-trip.
 */
import "fake-indexeddb/auto";

import { beforeAll, describe, expect, it } from "vitest";

import { localClient } from "@/lib/api/local";
import { clearAllData, exportAllData, importAllData } from "@/lib/api/local/backup";

// jsdom's Blob/File lacks arrayBuffer() (real browsers have it). Polyfill via
// FileReader so the in-browser upload path can be exercised under jsdom.
if (typeof Blob !== "undefined" && typeof Blob.prototype.arrayBuffer !== "function") {
  Blob.prototype.arrayBuffer = function arrayBuffer(): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(this as Blob);
    });
  };
}

const {
  authApi,
  profileApi,
  resumeApi,
  jobApi,
  matchApi,
  reportApi,
  discoveryApi,
  recommendationApi,
  rewriteApi,
  applicationApi,
} = localClient;

let resumeId: string;
let versionId: string;
let jobId: string;
let reportId: string;

describe("local DataClient end-to-end (IndexedDB)", () => {
  beforeAll(async () => {
    await authApi.guest();
  });

  it("provisions a persistent local user", async () => {
    const me = await authApi.me();
    expect(me.accountType).toBe("local");
    expect(me.role).toBe("student");
  });

  it("seeds a profile, a parsed resume and a job library", async () => {
    const profile = await profileApi.get();
    expect(profile.school).toBe("北京大学");

    const resumes = await resumeApi.list();
    expect(resumes.items).toHaveLength(1);
    resumeId = resumes.items[0].id;

    const detail = await resumeApi.get(resumeId);
    expect(detail.latestVersion).not.toBeNull();
    versionId = detail.latestVersion!.id;
    expect(detail.latestVersion!.skillTags).toContain("Python");

    const jobs = await jobApi.list();
    expect(jobs.items).toHaveLength(3);
    jobId = jobs.items[0].id;

    const job = await jobApi.get(jobId);
    expect(job.analysis?.hardSkills.length).toBeGreaterThan(0);
  });

  it("runs a match inline and produces a scored report", async () => {
    const task = await matchApi.create(versionId, jobId);
    expect(task.status).toBe("succeeded");
    expect(task.reportId).toBeTruthy();
    reportId = task.reportId!;

    const report = await reportApi.get(reportId);
    expect(report.overallScore).toBeGreaterThan(0);
    expect(report.overallScore).toBeLessThanOrEqual(100);
    expect(report.dimensionScores).toHaveLength(6);
    expect(report.suggestions.length).toBeGreaterThan(0);

    const list = await reportApi.list();
    expect(list.items.length).toBeGreaterThanOrEqual(1);
  });

  it("exports a report as Markdown and JSON", async () => {
    const md = await reportApi.export(reportId, "md");
    expect(md.filename).toMatch(/\.md$/);
    expect(md.blob.size).toBeGreaterThan(0);

    const json = await reportApi.export(reportId, "json");
    expect(json.filename).toMatch(/\.json$/);
    expect(json.blob.size).toBeGreaterThan(0);
  });

  it("updates a suggestion status", async () => {
    const report = await reportApi.get(reportId);
    const updated = await reportApi.updateSuggestion(report.suggestions[0].id, "accepted");
    expect(updated.status).toBe("accepted");
  });

  it("discovers candidates and builds tiered recommendations", async () => {
    const task = await discoveryApi.createTask({});
    expect(task.candidateCount).toBeGreaterThan(0);

    const candidates = await discoveryApi.candidates(task.discoveryTaskId);
    expect(candidates).toHaveLength(task.candidateCount);

    const rec = await recommendationApi.createTiered(task.discoveryTaskId);
    const total = rec.tiers.reduce((n, t) => n + t.items.length, 0);
    expect(total).toBeGreaterThan(0);
    expect(rec.summary).toBeTruthy();

    const fetched = await recommendationApi.get(rec.recommendationId);
    expect(fetched.recommendationId).toBe(rec.recommendationId);
  });

  it("drafts and confirms a fact-safe resume rewrite", async () => {
    const task = await rewriteApi.create(versionId, reportId, []);
    expect(task.status).toBe("drafted");

    const confirmed = await rewriteApi.confirm(
      task.rewriteTaskId,
      "负责相关工作，并持续优化简历表达与结构。",
      "改写版本",
    );
    expect(confirmed.status).toBe("confirmed");
    expect(confirmed.newResumeVersionId).toBeTruthy();

    const versions = await resumeApi.versions(resumeId);
    expect(versions.length).toBeGreaterThanOrEqual(2);
  });

  it("rejects a rewrite that fabricates skills or numbers", async () => {
    const task = await rewriteApi.create(versionId, reportId, []);
    await expect(
      rewriteApi.confirm(task.rewriteTaskId, "精通 Hadoop 与 Spark，使用率提升 999%。"),
    ).rejects.toThrow();
  });

  it("tracks an application through statuses", async () => {
    const record = await applicationApi.create({ jobId, status: "applied", note: "已投递" });
    expect(record.status).toBe("applied");
    expect(record.appliedAt).toBeTruthy();

    const updated = await applicationApi.update(record.id, { status: "interview" });
    expect(updated.status).toBe("interview");

    const list = await applicationApi.list();
    expect(list.items).toHaveLength(1);
  });

  it("parses an uploaded TXT resume in-browser", async () => {
    const file = new File(
      ["技能\nPython SQL 数据分析\n项目经历\n负责数据分析，构建用户分群模型。"],
      "上传简历.txt",
      { type: "text/plain" },
    );
    const detail = await resumeApi.upload(file, "上传简历", false);
    expect(detail.latestVersion?.skillTags).toContain("Python");
  });

  it("round-trips data through backup export / clear / import", async () => {
    const before = (await resumeApi.list()).items.length;
    const backup = await exportAllData();
    expect((backup.stores.resumes as unknown[]).length).toBeGreaterThan(0);

    await clearAllData();
    await authApi.guest(); // re-provisions a fresh user after a full wipe

    await importAllData(backup);
    const after = (await resumeApi.list()).items.length;
    expect(after).toBe(before);
  });
});
