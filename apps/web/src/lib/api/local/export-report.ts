/** Render a match report as downloadable Markdown — port of `report/export.py`. */
import type { GapItem, ReportDetail, ReportInsight, Suggestion } from "@/lib/api/types";

const MATCH_LEVEL_LABELS: Record<string, string> = {
  excellent: "高度匹配",
  high: "较匹配",
  medium: "部分匹配",
  low: "匹配不足",
};
const SEVERITY_LABELS: Record<string, string> = { high: "高", medium: "中", low: "低" };
const PRIORITY_LABELS: Record<string, string> = { high: "高", medium: "中", low: "低" };

function heading(detail: ReportDetail): string[] {
  let title = detail.job.title;
  if (detail.job.company) title = `${title}（${detail.job.company}）`;
  const level = MATCH_LEVEL_LABELS[detail.matchLevel] ?? detail.matchLevel;
  return [
    `# 匹配报告：${title}`,
    "",
    `- 综合匹配度：**${detail.overallScore}** 分（${level}）`,
    `- 生成时间：${detail.createdAt}`,
    `- 评分版本：${detail.scoringVersion ?? "-"}`,
    "",
  ];
}

function summarySection(detail: ReportDetail): string[] {
  if (!detail.summary) return [];
  return ["## 总体评价", "", detail.summary, ""];
}

function dimensions(detail: ReportDetail): string[] {
  if (!detail.dimensionScores.length) return [];
  const lines = ["## 维度评分", "", "| 维度 | 得分 | 权重 |", "| --- | --- | --- |"];
  for (const dim of detail.dimensionScores) {
    lines.push(`| ${dim.name ?? dim.code} | ${dim.score} | ${dim.weight}% |`);
  }
  lines.push("");
  return lines;
}

function bulletSection<T>(title: string, items: T[], render: (item: T) => string): string[] {
  if (!items.length) return [];
  return [`## ${title}`, "", ...items.map(render), ""];
}

function strengths(detail: ReportDetail): string[] {
  return bulletSection("核心优势", detail.strengths, (s: ReportInsight) => {
    return `- **${s.title ?? "优势"}**：${s.description ?? ""}`;
  });
}

function gaps(detail: ReportDetail): string[] {
  return bulletSection("能力差距", detail.gaps, (gap: GapItem) => {
    const severity = SEVERITY_LABELS[gap.severity] ?? gap.severity ?? "";
    const prefix = severity ? `[${severity}] ` : "";
    return `- ${prefix}${gap.description ?? ""}`;
  });
}

function risks(detail: ReportDetail): string[] {
  return bulletSection("风险提示", detail.risks, (r: ReportInsight) => {
    const description = (r.description as string | undefined) ?? "";
    return `- ${description}`;
  });
}

function suggestions(detail: ReportDetail): string[] {
  if (!detail.suggestions.length) return [];
  const lines = ["## 优化建议", ""];
  detail.suggestions.forEach((sug: Suggestion, idx) => {
    const priority = PRIORITY_LABELS[sug.priority] ?? sug.priority;
    lines.push(`### ${idx + 1}. ${sug.suggestion ?? sug.category}（优先级：${priority}）`);
    if (sug.problem) lines.push(`- 问题：${sug.problem}`);
    if (sug.reason) lines.push(`- 原因：${sug.reason}`);
    if (sug.example) lines.push(`- 示例：${sug.example}`);
    lines.push("");
  });
  return lines;
}

/** Render a full report as a Markdown document. */
export function renderReportMarkdown(detail: ReportDetail): string {
  const blocks: string[] = [
    ...heading(detail),
    ...summarySection(detail),
    ...dimensions(detail),
    ...strengths(detail),
    ...gaps(detail),
    ...risks(detail),
    ...suggestions(detail),
  ];
  return `${blocks.join("\n").trim()}\n`;
}
