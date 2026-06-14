export type BadgeTone = "neutral" | "primary" | "success" | "warning" | "info" | "critical";

export interface LabelMeta {
  label: string;
  tone: BadgeTone;
}

export const MATCH_LEVEL: Record<string, LabelMeta> = {
  excellent: { label: "高度匹配", tone: "success" },
  high: { label: "较匹配", tone: "primary" },
  strong: { label: "较强匹配", tone: "success" },
  good: { label: "良好匹配", tone: "primary" },
  medium: { label: "中等匹配", tone: "warning" },
  weak: { label: "匹配偏弱", tone: "critical" },
  low: { label: "匹配偏弱", tone: "critical" },
};

export const PRIORITY: Record<string, LabelMeta> = {
  high: { label: "高优先级", tone: "critical" },
  medium: { label: "中优先级", tone: "warning" },
  low: { label: "低优先级", tone: "neutral" },
};

export const SUGGESTION_CATEGORY: Record<string, string> = {
  content: "内容补强",
  expression: "表达优化",
  structure: "结构调整",
  keyword: "关键词",
  evidence: "证据补充",
  risk: "风险提示",
};

export const RISK_LEVEL: Record<string, LabelMeta> = {
  high: { label: "高风险", tone: "critical" },
  medium: { label: "中风险", tone: "warning" },
  low: { label: "低风险", tone: "success" },
};

export const APPLICATION_STATUS: Record<string, LabelMeta> = {
  interested: { label: "意向", tone: "neutral" },
  applied: { label: "已投递", tone: "primary" },
  written_test: { label: "笔试", tone: "info" },
  interview: { label: "面试", tone: "warning" },
  offer: { label: "Offer", tone: "success" },
  rejected: { label: "未通过", tone: "critical" },
  closed: { label: "已关闭", tone: "neutral" },
};

/** Ordered status pipeline for the application-tracking board. */
export const APPLICATION_STATUS_ORDER = [
  "interested",
  "applied",
  "written_test",
  "interview",
  "offer",
  "rejected",
  "closed",
] as const;

export function formatProbability(value: number): string {
  if (!Number.isFinite(value)) return "-";
  const percent = value > 1 ? value : value * 100;
  return `${Math.round(percent)}%`;
}