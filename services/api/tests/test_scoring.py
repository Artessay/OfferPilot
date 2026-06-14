"""Unit tests for the deterministic match scoring engine."""

from __future__ import annotations

from app.ai.embedding import deterministic_embedding
from app.ai.scoring.engine import MatchScorer, ScoreInputs
from app.ai.scoring.suggestions import generate_suggestions
from app.ai.scoring.weights import level_for_score


def _inputs(resume_skills: list[str], resume_text: str, job_skills: list[str]) -> ScoreInputs:
    return ScoreInputs(
        resume_skill_tags=resume_skills,
        resume_text=resume_text,
        resume_embedding=deterministic_embedding(resume_text),
        job_hard_skills=job_skills,
        job_soft_skills=["沟通能力"],
        job_requirements=["熟练使用 SQL 和 Python 进行数据分析"],
        job_responsibilities=["负责用户行为数据分析，输出数据报告"],
        job_keywords=[{"term": "sql", "weight": 1.0}, {"term": "python", "weight": 0.9}],
        job_embedding=deterministic_embedding("SQL Python 数据分析 用户行为"),
        job_city="上海",
        target_cities=["上海"],
    )


def test_level_thresholds() -> None:
    assert level_for_score(90) == "excellent"
    assert level_for_score(75) == "high"
    assert level_for_score(60) == "medium"
    assert level_for_score(40) == "low"


def test_strong_match_scores_higher_than_weak() -> None:
    strong = MatchScorer().score(
        _inputs(
            ["SQL", "Python", "数据分析"],
            "负责使用 SQL 和 Python 完成用户行为数据分析，输出报告，提升留存 8%。",
            ["SQL", "Python"],
        )
    )
    weak = MatchScorer().score(
        _inputs(["PPT", "文案"], "负责公众号文案撰写与排版。", ["SQL", "Python"])
    )
    assert strong.overall_score > weak.overall_score
    assert "SQL" in strong.matched_hard_skills
    assert "SQL" in weak.missing_hard_skills


def test_dimensions_and_weights_present() -> None:
    result = MatchScorer().score(_inputs(["SQL"], "使用 SQL 完成分析", ["SQL", "Python"]))
    codes = {d["code"] for d in result.dimension_scores}
    assert codes == {
        "hard_skills",
        "experience",
        "keywords",
        "basic_conditions",
        "soft_skills_interest",
        "expression_quality",
    }
    assert sum(d["weight"] for d in result.dimension_scores) == 95
    assert 0 <= result.overall_score <= 100


def test_missing_skills_produce_gaps_and_suggestions() -> None:
    result = MatchScorer().score(_inputs(["PPT"], "负责活动策划", ["SQL", "Python", "数据分析"]))
    assert result.missing_hard_skills
    assert any(g["category"] == "keyword" for g in result.gaps)
    suggestions = generate_suggestions(result)
    assert len(suggestions) >= 5
    # A "must add real experience" suggestion must not be rewritable.
    assert any(s["category"] == "risk" and s["rewritable"] is False for s in suggestions)


def test_score_is_deterministic() -> None:
    a = MatchScorer().score(_inputs(["SQL"], "使用 SQL 分析数据", ["SQL"]))
    b = MatchScorer().score(_inputs(["SQL"], "使用 SQL 分析数据", ["SQL"]))
    assert a.overall_score == b.overall_score
