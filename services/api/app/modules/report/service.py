"""Report service: persist reports, query, suggestion status, regeneration."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.scoring.engine import ScoreResult
from app.ai.scoring.suggestions import generate_suggestions
from app.ai.scoring.weights import SCORING_VERSION
from app.modules.job.service import JobService
from app.modules.match.models import MatchTask
from app.modules.report.models import MatchReport, OptimizationSuggestion
from app.modules.report.repository import MatchReportRepository, SuggestionRepository
from app.modules.report.schemas import JobRef, ReportDetail, SuggestionOut
from app.shared.errors import NotFoundError


class ReportService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.reports = MatchReportRepository(session)
        self.suggestions = SuggestionRepository(session)

    async def create_from_score(
        self,
        task: MatchTask,
        result: ScoreResult,
        suggestion_dicts: list[dict[str, Any]],
    ) -> MatchReport:
        report = MatchReport(
            match_task_id=task.id,
            user_id=task.user_id,
            job_id=task.job_id,
            resume_version_id=task.resume_version_id,
            overall_score=result.overall_score,
            match_level=result.match_level,
            dimension_scores=result.dimension_scores,
            strengths=result.strengths,
            gaps=result.gaps,
            risks=result.risks,
            evidence=result.evidence,
            summary=result.summary,
            scoring_version=result.scoring_version,
            model_version="rule+fake",
            prompt_version=SCORING_VERSION,
        )
        await self.reports.add(report)
        await self._persist_suggestions(report.id, suggestion_dicts)
        return report

    async def _persist_suggestions(
        self, report_id: uuid.UUID, suggestion_dicts: list[dict[str, Any]]
    ) -> None:
        for item in suggestion_dicts:
            self.session.add(
                OptimizationSuggestion(
                    report_id=report_id,
                    category=item["category"],
                    priority=item["priority"],
                    problem=item.get("problem"),
                    reason=item.get("reason"),
                    suggestion=item.get("suggestion"),
                    example=item.get("example"),
                    evidence_refs=item.get("evidenceRefs", []),
                    rewritable=item.get("rewritable", True),
                )
            )
        await self.session.flush()

    async def get_report(self, user_id: uuid.UUID, report_id: uuid.UUID) -> ReportDetail:
        report = await self._require_owned(report_id, user_id)
        suggestions = await self.suggestions.list_for_report(report_id)
        job = await JobService(self.session).get_job(user_id, report.job_id)
        return ReportDetail(
            id=report.id,
            job=JobRef(job_id=job.id, title=job.title, company=job.company),
            resume_version_id=report.resume_version_id,
            overall_score=report.overall_score,
            match_level=report.match_level,
            dimension_scores=report.dimension_scores,
            strengths=report.strengths,
            gaps=report.gaps,
            risks=report.risks,
            evidence=report.evidence,
            summary=report.summary,
            suggestions=[SuggestionOut.model_validate(s) for s in suggestions],
            scoring_version=report.scoring_version,
            created_at=report.created_at,
        )

    async def list_reports(
        self,
        user_id: uuid.UUID,
        *,
        job_id: uuid.UUID | None,
        resume_version_id: uuid.UUID | None,
        offset: int,
        limit: int,
    ) -> tuple[list[MatchReport], int]:
        return await self.reports.search(
            user_id,
            job_id=job_id,
            resume_version_id=resume_version_id,
            offset=offset,
            limit=limit,
        )

    async def update_suggestion_status(
        self, user_id: uuid.UUID, suggestion_id: uuid.UUID, status: str, note: str | None
    ) -> OptimizationSuggestion:
        suggestion = await self.suggestions.get_owned(suggestion_id, user_id)
        if suggestion is None:
            raise NotFoundError("建议不存在。")
        suggestion.status = status
        await self.session.flush()
        return suggestion

    async def regenerate_suggestions(
        self, user_id: uuid.UUID, report_id: uuid.UUID
    ) -> list[OptimizationSuggestion]:
        report = await self._require_owned(report_id, user_id)
        # Reconstruct the minimal score view needed by the generator.
        missing = [
            s
            for gap in report.gaps
            if gap.get("category") == "keyword"
            for s in _split_skills(gap.get("description", ""))
        ]
        result = ScoreResult(
            overall_score=report.overall_score,
            match_level=report.match_level,
            dimension_scores=report.dimension_scores,
            strengths=report.strengths,
            gaps=report.gaps,
            risks=report.risks,
            evidence=report.evidence,
            summary=report.summary or "",
            matched_hard_skills=[],
            missing_hard_skills=missing,
        )
        await self.suggestions.delete_for_report(report_id)
        await self._persist_suggestions(report_id, generate_suggestions(result))
        return list(await self.suggestions.list_for_report(report_id))

    async def _require_owned(self, report_id: uuid.UUID, user_id: uuid.UUID) -> MatchReport:
        report = await self.reports.get_owned(report_id, user_id)
        if report is None:
            raise NotFoundError("报告不存在。")
        return report


def _split_skills(description: str) -> list[str]:
    tail = description.split("：")[-1].rstrip("。")
    return [part for part in tail.replace("、", ",").split(",") if part.strip()]
