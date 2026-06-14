"""Generate actionable resume-optimization suggestions from a score result.

Distinguishes expression-level fixes (rewritable) from suggestions that require
genuinely adding real experience (not rewritable — never fabricate), per design
§5.6 and business rule BR06.
"""

from __future__ import annotations

from typing import Any

from app.ai.scoring.engine import ScoreResult


def generate_suggestions(result: ScoreResult) -> list[dict[str, Any]]:
    """Return a prioritised list of suggestion dicts (>= a few items)."""
    suggestions: list[dict[str, Any]] = []

    for skill in result.missing_hard_skills[:4]:
        suggestions.append(
            {
                "category": "keyword",
                "priority": "high",
                "problem": f"岗位要求 {skill}，但简历未明确体现。",
                "reason": f"{skill} 是岗位的核心技能，初筛通常据此筛选关键词。",
                "suggestion": (
                    f"若你具备 {skill} 的真实经历，请在项目或实习描述中明确写出使用场景与成果。"
                ),
                "example": f"使用 {skill} 完成 X 任务，支撑 Y 目标，取得 Z 结果。",
                "evidenceRefs": ["ev_missing_skills"],
                "rewritable": True,
            }
        )

    for gap in result.gaps:
        if gap["category"] == "impact":
            suggestions.append(
                {
                    "category": "impact",
                    "priority": "high",
                    "problem": "项目描述缺少量化结果。",
                    "reason": "目标岗位强调结果导向，量化数据更能体现你的价值。",
                    "suggestion": (
                        "为关键项目补充目标、你的动作和可衡量的结果（增长率、效率、规模等）。"
                    ),
                    "example": (
                        "通过 SQL 分析 10 万条用户行为数据，定位流失环节，推动次日留存提升 8%。"
                    ),
                    "evidenceRefs": [],
                    "rewritable": True,
                }
            )
        elif gap["category"] == "experience":
            suggestions.append(
                {
                    "category": "experience",
                    "priority": "medium",
                    "problem": "经历与岗位职责的相关度不足。",
                    "reason": "岗位职责与你的项目存在距离，需要强化对应表达或补充相关实践。",
                    "suggestion": "将与岗位最相关的项目前置，并按岗位职责重写任务与成果描述。",
                    "example": "把数据分析相关项目调整到简历靠前位置，并对齐岗位职责中的关键词。",
                    "evidenceRefs": [],
                    "rewritable": True,
                }
            )

    # If core skills are genuinely missing, advise real upskilling (not rewrite).
    if len(result.missing_hard_skills) >= 3:
        suggestions.append(
            {
                "category": "risk",
                "priority": "high",
                "problem": "存在多项关键技能缺口。",
                "reason": "这些技能需要真实掌握，简历改写无法替代真实能力。",
                "suggestion": (
                    "建议通过课程、项目或实习补齐关键技能，再据实更新简历，切勿编造经历。"
                ),
                "example": "完成一个使用目标技能的真实项目后，再将其写入简历。",
                "evidenceRefs": ["ev_missing_skills"],
                "rewritable": False,
            }
        )

    # Always include a structure suggestion to reach a useful baseline count.
    suggestions.append(
        {
            "category": "structure",
            "priority": "low",
            "problem": "简历结构可进一步对齐目标岗位。",
            "reason": "清晰、聚焦的结构有助于初筛快速识别匹配点。",
            "suggestion": "将与目标岗位最相关的经历集中前置，弱化无关内容。",
            "example": "把目标岗位相关项目放在教育经历之后、首屏可见位置。",
            "evidenceRefs": [],
            "rewritable": True,
        }
    )

    return suggestions
