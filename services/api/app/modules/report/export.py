"""Render a match report as downloadable Markdown."""

from __future__ import annotations

from typing import Any

from app.modules.report.schemas import ReportDetail

_MATCH_LEVEL_LABELS = {
    "excellent": "高度匹配",
    "high": "较匹配",
    "medium": "部分匹配",
    "low": "匹配不足",
}

_SEVERITY_LABELS = {"high": "高", "medium": "中", "low": "低"}
_PRIORITY_LABELS = {"high": "高", "medium": "中", "low": "低"}


def _heading(detail: ReportDetail) -> list[str]:
    title = detail.job.title
    if detail.job.company:
        title = f"{title}（{detail.job.company}）"
    level = _MATCH_LEVEL_LABELS.get(detail.match_level, detail.match_level)
    return [
        f"# 匹配报告：{title}",
        "",
        f"- 综合匹配度：**{detail.overall_score}** 分（{level}）",
        f"- 生成时间：{detail.created_at.isoformat()}",
        f"- 评分版本：{detail.scoring_version or '-'}",
        "",
    ]


def _summary(detail: ReportDetail) -> list[str]:
    if not detail.summary:
        return []
    return ["## 总体评价", "", detail.summary, ""]


def _dimensions(detail: ReportDetail) -> list[str]:
    if not detail.dimension_scores:
        return []
    lines = ["## 维度评分", "", "| 维度 | 得分 | 权重 |", "| --- | --- | --- |"]
    for dim in detail.dimension_scores:
        name = dim.get("name", dim.get("code", "-"))
        score = dim.get("score", "-")
        weight = dim.get("weight", "-")
        lines.append(f"| {name} | {score} | {weight}% |")
    lines.append("")
    return lines


def _bullet_section(title: str, items: list[dict[str, Any]], render: Any) -> list[str]:
    if not items:
        return []
    lines = [f"## {title}", ""]
    lines.extend(render(item) for item in items)
    lines.append("")
    return lines


def _strengths(detail: ReportDetail) -> list[str]:
    return _bullet_section(
        "核心优势",
        detail.strengths,
        lambda s: f"- **{s.get('title', '优势')}**：{s.get('description', '')}",
    )


def _gaps(detail: ReportDetail) -> list[str]:
    def render(gap: dict[str, Any]) -> str:
        severity = _SEVERITY_LABELS.get(gap.get("severity", ""), gap.get("severity", ""))
        prefix = f"[{severity}] " if severity else ""
        return f"- {prefix}{gap.get('description', '')}"

    return _bullet_section("能力差距", detail.gaps, render)


def _risks(detail: ReportDetail) -> list[str]:
    return _bullet_section(
        "风险提示",
        detail.risks,
        lambda r: f"- {r.get('description', '')}",
    )


def _suggestions(detail: ReportDetail) -> list[str]:
    if not detail.suggestions:
        return []
    lines = ["## 优化建议", ""]
    for idx, sug in enumerate(detail.suggestions, start=1):
        priority = _PRIORITY_LABELS.get(sug.priority, sug.priority)
        lines.append(f"### {idx}. {sug.suggestion or sug.category}（优先级：{priority}）")
        if sug.problem:
            lines.append(f"- 问题：{sug.problem}")
        if sug.reason:
            lines.append(f"- 原因：{sug.reason}")
        if sug.example:
            lines.append(f"- 示例：{sug.example}")
        lines.append("")
    return lines


def render_markdown(detail: ReportDetail) -> str:
    """Render a full report as a Markdown document."""
    blocks: list[str] = []
    blocks.extend(_heading(detail))
    blocks.extend(_summary(detail))
    blocks.extend(_dimensions(detail))
    blocks.extend(_strengths(detail))
    blocks.extend(_gaps(detail))
    blocks.extend(_risks(detail))
    blocks.extend(_suggestions(detail))
    return "\n".join(blocks).strip() + "\n"
