/** Local-mode match API: run the deterministic scorer inline and persist a report. */
import { scoreMatch, type ScoreInputs } from "@/lib/ai/scoring/engine";
import { generateSuggestions } from "@/lib/ai/scoring/suggestions";
import type { MatchApi } from "@/lib/api/contract";
import { getDb } from "@/lib/api/local/db";
import { currentUserId, fail, notFound, nowIso, uuid } from "@/lib/api/local/helpers";
import { analysisForJob, visibleJob } from "@/lib/api/local/job";
import { getOwnedVersion } from "@/lib/api/local/resume";
import type { MatchTask } from "@/lib/api/types";

export const localMatchApi: MatchApi = {
  async create(resumeVersionId: string, jobId: string): Promise<MatchTask> {
    const db = await getDb();
    const userId = await currentUserId();
    const version = await getOwnedVersion(db, resumeVersionId, userId);
    const job = await visibleJob(db, jobId, userId);
    if (!job) notFound("岗位不存在。");
    const analysis = await analysisForJob(db, jobId);
    if (!analysis) fail("岗位尚未解析，无法生成匹配。");
    const [profile] = await db.getAllFromIndex("profiles", "byUser", userId);

    const inputs: ScoreInputs = {
      resumeSkillTags: version.skillTags,
      resumeText: version.rawText,
      resumeEmbedding: version.embedding,
      jobHardSkills: analysis.hardSkills,
      jobSoftSkills: analysis.softSkills,
      jobRequirements: analysis.requirements.map(String),
      jobResponsibilities: analysis.responsibilities.map(String),
      jobKeywords: analysis.keywords,
      jobEmbedding: analysis.embedding,
      jobCity: job.city,
      targetCities: profile?.targetCities ?? [],
    };
    const result = scoreMatch(inputs);
    const suggestions = generateSuggestions(result);

    const ts = nowIso();
    const taskId = uuid();
    const reportId = uuid();

    await db.put("match_tasks", {
      id: taskId,
      userId,
      resumeVersionId,
      jobId,
      status: "succeeded",
      progress: 100,
      reportId,
      errorCode: null,
      createdAt: ts,
    });
    await db.put("match_reports", {
      id: reportId,
      userId,
      matchTaskId: taskId,
      jobId,
      resumeVersionId,
      overallScore: result.overallScore,
      matchLevel: result.matchLevel,
      dimensionScores: result.dimensionScores,
      strengths: result.strengths,
      gaps: result.gaps,
      risks: result.risks,
      evidence: result.evidence,
      summary: result.summary,
      scoringVersion: result.scoringVersion,
      createdAt: ts,
    });
    let order = 0;
    for (const s of suggestions) {
      await db.put("suggestions", {
        id: uuid(),
        reportId,
        order: order,
        category: s.category,
        priority: s.priority,
        problem: s.problem,
        reason: s.reason,
        suggestion: s.suggestion,
        example: s.example,
        evidenceRefs: s.evidenceRefs,
        rewritable: s.rewritable,
        status: "pending",
        createdAt: ts,
      });
      order += 1;
    }

    return {
      matchTaskId: taskId,
      status: "succeeded",
      progress: 100,
      estimatedSeconds: 0,
      reportId,
      errorCode: null,
    };
  },
};
