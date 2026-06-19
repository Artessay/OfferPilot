/**
 * Local-mode admin API. Admin/Settings is hidden in local mode (the local user
 * is a "student"), but these are implemented against local stores so the
 * surface stays complete and type-safe.
 */
import type {
  AdminApi,
  ListParams,
  PromptCreateInput,
  RuleCreateInput,
} from "@/lib/api/contract";
import { buildJobAnalysisData } from "@/lib/api/local/compute";
import { getDb } from "@/lib/api/local/db";
import { normalizeText } from "@/lib/api/local/documents";
import { currentUserId, fail, nowIso, paginate, uuid } from "@/lib/api/local/helpers";
import { toJobSummary, toUserPublic } from "@/lib/api/local/mappers";
import type {
  AdminUserSummary,
  JobInput,
  JobSummary,
  Page,
  PromptTemplate,
  ScoringRule,
} from "@/lib/api/types";

export const localAdminApi: AdminApi = {
  async listPrompts(): Promise<PromptTemplate[]> {
    const db = await getDb();
    return db.getAll("prompt_templates");
  },

  async createPrompt(input: PromptCreateInput): Promise<PromptTemplate> {
    const db = await getDb();
    const row: PromptTemplate = {
      id: uuid(),
      name: input.name,
      version: input.version,
      content: input.content,
      schemaVersion: input.schemaVersion ?? null,
      isActive: input.isActive ?? false,
      updatedAt: nowIso(),
    };
    if (row.isActive) {
      for (const p of await db.getAll("prompt_templates")) {
        if (p.name === row.name && p.isActive) {
          p.isActive = false;
          await db.put("prompt_templates", p);
        }
      }
    }
    await db.put("prompt_templates", row);
    return row;
  },

  async activatePrompt(promptId: string): Promise<PromptTemplate> {
    const db = await getDb();
    const target = await db.get("prompt_templates", promptId);
    if (!target) fail("提示词模板不存在。", 404);
    for (const p of await db.getAll("prompt_templates")) {
      if (p.name === target.name && p.isActive) {
        p.isActive = false;
        await db.put("prompt_templates", p);
      }
    }
    target.isActive = true;
    target.updatedAt = nowIso();
    await db.put("prompt_templates", target);
    return target;
  },

  async deletePrompt(promptId: string): Promise<void> {
    await (await getDb()).delete("prompt_templates", promptId);
  },

  async listRules(): Promise<ScoringRule[]> {
    const db = await getDb();
    return db.getAll("scoring_rules");
  },

  async createRule(input: RuleCreateInput): Promise<ScoringRule> {
    const db = await getDb();
    const row: ScoringRule = {
      id: uuid(),
      name: input.name,
      version: input.version,
      weights: input.weights,
      isActive: input.isActive ?? false,
      updatedAt: nowIso(),
    };
    if (row.isActive) {
      for (const r of await db.getAll("scoring_rules")) {
        if (r.name === row.name && r.isActive) {
          r.isActive = false;
          await db.put("scoring_rules", r);
        }
      }
    }
    await db.put("scoring_rules", row);
    return row;
  },

  async activateRule(ruleId: string): Promise<ScoringRule> {
    const db = await getDb();
    const target = await db.get("scoring_rules", ruleId);
    if (!target) fail("评分规则不存在。", 404);
    for (const r of await db.getAll("scoring_rules")) {
      if (r.name === target.name && r.isActive) {
        r.isActive = false;
        await db.put("scoring_rules", r);
      }
    }
    target.isActive = true;
    target.updatedAt = nowIso();
    await db.put("scoring_rules", target);
    return target;
  },

  async deleteRule(ruleId: string): Promise<void> {
    await (await getDb()).delete("scoring_rules", ruleId);
  },

  async listJobs(params?: ListParams): Promise<Page<JobSummary>> {
    const db = await getDb();
    const all = await db.getAll("jobs");
    const publicJobs = all.filter((j) => j.userId === null).map(toJobSummary);
    return paginate(publicJobs, params);
  },

  async createJob(input: JobInput): Promise<JobSummary> {
    const db = await getDb();
    const jdText = normalizeText(input.jdText);
    const job = {
      id: uuid(),
      userId: null,
      title: input.title,
      company: input.company ?? null,
      city: input.city ?? null,
      sourceType: input.sourceType ?? "admin",
      status: "parsed",
      jdText,
      createdAt: nowIso(),
    };
    await db.put("jobs", job);
    const analysis = buildJobAnalysisData(job.title, job.company, jdText);
    await db.put("job_analyses", { id: uuid(), jobId: job.id, ...analysis });
    return toJobSummary(job);
  },

  async deleteJob(jobId: string): Promise<void> {
    await (await getDb()).delete("jobs", jobId);
  },

  async listUsers(params?: ListParams): Promise<Page<AdminUserSummary>> {
    const db = await getDb();
    await currentUserId();
    const users = await db.getAll("users");
    return paginate(users.map(toUserPublic), params);
  },
};
