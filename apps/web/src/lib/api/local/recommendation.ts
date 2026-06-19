/** Local-mode tiered recommendation API. */
import { scoreMatch, type ScoreInputs } from "@/lib/ai/scoring/engine";
import {
  classifyTier,
  opportunityValue,
  predictSuccessProbability,
  riskLevel,
} from "@/lib/ai/recommendation";
import type { RecommendationApi } from "@/lib/api/contract";
import type { OfferPilotDB } from "@/lib/api/local/db";
import { getDb } from "@/lib/api/local/db";
import { currentUserId, fail, notFound, nowIso, uuid } from "@/lib/api/local/helpers";
import { analysisForJob } from "@/lib/api/local/job";
import type { RecommendationListRow } from "@/lib/api/local/rows";
import { getOwnedVersion } from "@/lib/api/local/resume";
import type { Recommendation, TierGroup, TierItem } from "@/lib/api/types";
import type { IDBPDatabase } from "idb";

type DB = IDBPDatabase<OfferPilotDB>;

const TIER_DISPLAY: [code: string, name: string][] = [
  ["priority", "重点匹配层"],
  ["exploratory", "拓展机会层"],
  ["baseline", "基础保障层"],
];

async function buildRecommendation(db: DB, list: RecommendationListRow): Promise<Recommendation> {
  const items = await db.getAllFromIndex("recommendation_items", "byList", list.id);
  const tiers: TierGroup[] = [];
  for (const [code, name] of TIER_DISPLAY) {
    const tierItems: TierItem[] = [];
    for (const item of items.filter((i) => i.tier === code)) {
      const job = await db.get("jobs", item.jobId);
      tierItems.push({
        jobId: item.jobId,
        title: job?.title ?? "未知岗位",
        company: job?.company ?? null,
        matchScore: item.matchScore,
        successProbability: item.successProbability,
        opportunityValue: item.opportunityValue,
        riskLevel: item.riskLevel,
        tierReason: item.tierReason,
        suggestedAction: item.suggestedAction,
      });
    }
    tiers.push({ tier: code, name, items: tierItems });
  }
  return { recommendationId: list.id, strategy: list.strategy, summary: list.summary, tiers };
}

export const localRecommendationApi: RecommendationApi = {
  async createTiered(
    discoveryTaskId: string,
    resumeVersionId?: string,
    strategy = "balanced",
  ): Promise<Recommendation> {
    const db = await getDb();
    const userId = await currentUserId();
    const task = await db.get("discovery_tasks", discoveryTaskId);
    if (!task || task.userId !== userId) notFound("发现任务不存在。");
    const versionId = resumeVersionId ?? task.resumeVersionId;
    if (!versionId) fail("缺少用于评分的简历版本。");
    const version = await getOwnedVersion(db, versionId, userId);
    const [profile] = await db.getAllFromIndex("profiles", "byUser", userId);

    const candidates = await db.getAllFromIndex(
      "discovered_candidates",
      "byTask",
      discoveryTaskId,
    );
    if (!candidates.length) fail("没有可用于推荐的候选岗位。");

    const listId = uuid();
    const ts = nowIso();
    const scores: number[] = [];
    const tierCounts: Record<string, number> = { priority: 0, exploratory: 0, baseline: 0 };

    for (const candidate of candidates.sort((a, b) => a.sourceRank - b.sourceRank)) {
      const job = await db.get("jobs", candidate.jobId);
      if (!job) continue;
      const analysis = await analysisForJob(db, job.id);
      if (!analysis) continue;

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
      const success = predictSuccessProbability(result);
      const risk = riskLevel(result);
      const opportunity = opportunityValue({
        targetRoles: profile?.targetRoles ?? [],
        targetCities: profile?.targetCities ?? [],
        industries: profile?.industries ?? [],
        jobTitle: job.title,
        jobCompany: job.company,
        jobCity: job.city,
      });
      const tier = classifyTier({ result, opportunity, successProbability: success, risk, strategy });
      scores.push(tier.matchScore);
      tierCounts[tier.tier] = (tierCounts[tier.tier] ?? 0) + 1;
      await db.put("recommendation_items", {
        id: uuid(),
        recommendationListId: listId,
        jobId: job.id,
        tier: tier.tier,
        matchScore: tier.matchScore,
        successProbability: tier.successProbability,
        opportunityValue: tier.opportunityValue,
        riskLevel: tier.riskLevel,
        tierReason: tier.tierReason,
        suggestedAction: tier.suggestedAction,
      });
    }

    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const summary = scores.length
      ? `共 ${scores.length} 个候选岗位，平均匹配度 ${avg} 分；` +
        `重点匹配 ${tierCounts.priority} 个、拓展机会 ${tierCounts.exploratory} 个、` +
        `基础保障 ${tierCounts.baseline} 个。`
      : "未生成推荐岗位。";

    const list: RecommendationListRow = {
      id: listId,
      userId,
      discoveryTaskId,
      resumeVersionId: versionId,
      strategy,
      summary,
      createdAt: ts,
    };
    await db.put("recommendation_lists", list);
    return buildRecommendation(db, list);
  },

  async get(recommendationId: string): Promise<Recommendation> {
    const db = await getDb();
    const userId = await currentUserId();
    const list = await db.get("recommendation_lists", recommendationId);
    if (!list || list.userId !== userId) notFound("推荐组合不存在。");
    return buildRecommendation(db, list);
  },
};
