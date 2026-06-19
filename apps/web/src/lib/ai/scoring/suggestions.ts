/**
 * Generate actionable resume-optimization suggestions from a score result — a
 * port of `app/ai/scoring/suggestions.py`.
 *
 * Distinguishes expression-level fixes (rewritable) from suggestions that
 * require genuinely adding real experience (not rewritable — never fabricate).
 */
import type { ScoreResult } from "@/lib/ai/scoring/engine";

export interface SuggestionDraft {
  category: string;
  priority: string;
  problem: string;
  reason: string;
  suggestion: string;
  example: string | null;
  evidenceRefs: string[];
  rewritable: boolean;
}

/** Return a prioritised list of suggestion drafts (>= a few items). */
export function generateSuggestions(result: ScoreResult): SuggestionDraft[] {
  const suggestions: SuggestionDraft[] = [];

  for (const skill of result.missingHardSkills.slice(0, 4)) {
    suggestions.push({
      category: "keyword",
      priority: "high",
      problem: `岗位要求 ${skill}，但简历未明确体现。`,
      reason: `${skill} 是岗位的核心技能，初筛通常据此筛选关键词。`,
      suggestion: `若你具备 ${skill} 的真实经历，请在项目或实习描述中明确写出使用场景与成果。`,
      example: `使用 ${skill} 完成 X 任务，支撑 Y 目标，取得 Z 结果。`,
      evidenceRefs: ["ev_missing_skills"],
      rewritable: true,
    });
  }

  for (const gap of result.gaps) {
    if (gap.category === "impact") {
      suggestions.push({
        category: "impact",
        priority: "high",
        problem: "项目描述缺少量化结果。",
        reason: "目标岗位强调结果导向，量化数据更能体现你的价值。",
        suggestion: "为关键项目补充目标、你的动作和可衡量的结果（增长率、效率、规模等）。",
        example: "通过 SQL 分析 10 万条用户行为数据，定位流失环节，推动次日留存提升 8%。",
        evidenceRefs: [],
        rewritable: true,
      });
    } else if (gap.category === "experience") {
      suggestions.push({
        category: "experience",
        priority: "medium",
        problem: "经历与岗位职责的相关度不足。",
        reason: "岗位职责与你的项目存在距离，需要强化对应表达或补充相关实践。",
        suggestion: "将与岗位最相关的项目前置，并按岗位职责重写任务与成果描述。",
        example: "把数据分析相关项目调整到简历靠前位置，并对齐岗位职责中的关键词。",
        evidenceRefs: [],
        rewritable: true,
      });
    }
  }

  // If core skills are genuinely missing, advise real upskilling (not rewrite).
  if (result.missingHardSkills.length >= 3) {
    suggestions.push({
      category: "risk",
      priority: "high",
      problem: "存在多项关键技能缺口。",
      reason: "这些技能需要真实掌握，简历改写无法替代真实能力。",
      suggestion: "建议通过课程、项目或实习补齐关键技能，再据实更新简历，切勿编造经历。",
      example: "完成一个使用目标技能的真实项目后，再将其写入简历。",
      evidenceRefs: ["ev_missing_skills"],
      rewritable: false,
    });
  }

  // Always include a structure suggestion to reach a useful baseline count.
  suggestions.push({
    category: "structure",
    priority: "low",
    problem: "简历结构可进一步对齐目标岗位。",
    reason: "清晰、聚焦的结构有助于初筛快速识别匹配点。",
    suggestion: "将与目标岗位最相关的经历集中前置，弱化无关内容。",
    example: "把目标岗位相关项目放在教育经历之后、首屏可见位置。",
    evidenceRefs: [],
    rewritable: true,
  });

  return suggestions;
}
