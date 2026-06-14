"""Report data-access repositories."""

from __future__ import annotations

import uuid
from collections.abc import Sequence

from sqlalchemy import func, select

from app.db.repository import BaseRepository
from app.modules.report.models import MatchReport, OptimizationSuggestion


class MatchReportRepository(BaseRepository[MatchReport]):
    model = MatchReport

    async def get_owned(self, report_id: uuid.UUID, user_id: uuid.UUID) -> MatchReport | None:
        stmt = select(MatchReport).where(
            MatchReport.id == report_id, MatchReport.user_id == user_id
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_task(self, match_task_id: uuid.UUID) -> MatchReport | None:
        stmt = select(MatchReport).where(MatchReport.match_task_id == match_task_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def search(
        self,
        user_id: uuid.UUID,
        *,
        job_id: uuid.UUID | None,
        resume_version_id: uuid.UUID | None,
        offset: int,
        limit: int,
    ) -> tuple[list[MatchReport], int]:
        conditions = [MatchReport.user_id == user_id]
        if job_id:
            conditions.append(MatchReport.job_id == job_id)
        if resume_version_id:
            conditions.append(MatchReport.resume_version_id == resume_version_id)

        base = select(MatchReport).where(*conditions)
        total = int(
            (
                await self.session.execute(select(func.count()).select_from(base.subquery()))
            ).scalar_one()
        )
        stmt = base.order_by(MatchReport.created_at.desc()).offset(offset).limit(limit)
        items = list((await self.session.execute(stmt)).scalars().all())
        return items, total


class SuggestionRepository(BaseRepository[OptimizationSuggestion]):
    model = OptimizationSuggestion

    async def list_for_report(self, report_id: uuid.UUID) -> Sequence[OptimizationSuggestion]:
        stmt = (
            select(OptimizationSuggestion)
            .where(OptimizationSuggestion.report_id == report_id)
            .order_by(OptimizationSuggestion.created_at.asc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_owned(
        self, suggestion_id: uuid.UUID, user_id: uuid.UUID
    ) -> OptimizationSuggestion | None:
        stmt = (
            select(OptimizationSuggestion)
            .join(MatchReport, MatchReport.id == OptimizationSuggestion.report_id)
            .where(
                OptimizationSuggestion.id == suggestion_id,
                MatchReport.user_id == user_id,
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def delete_for_report(self, report_id: uuid.UUID) -> None:
        from sqlalchemy import delete

        await self.session.execute(
            delete(OptimizationSuggestion).where(OptimizationSuggestion.report_id == report_id)
        )
