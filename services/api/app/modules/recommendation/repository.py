"""Recommendation data-access repositories."""

from __future__ import annotations

import uuid
from collections.abc import Sequence

from sqlalchemy import select

from app.db.repository import BaseRepository
from app.modules.job.models import Job
from app.modules.recommendation.models import RecommendationItem, RecommendationList


class RecommendationListRepository(BaseRepository[RecommendationList]):
    model = RecommendationList

    async def get_owned(
        self, recommendation_id: uuid.UUID, user_id: uuid.UUID
    ) -> RecommendationList | None:
        stmt = select(RecommendationList).where(
            RecommendationList.id == recommendation_id,
            RecommendationList.user_id == user_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()


class RecommendationItemRepository(BaseRepository[RecommendationItem]):
    model = RecommendationItem

    async def list_for_list(
        self, recommendation_list_id: uuid.UUID
    ) -> Sequence[RecommendationItem]:
        stmt = (
            select(RecommendationItem)
            .where(RecommendationItem.recommendation_list_id == recommendation_list_id)
            .order_by(RecommendationItem.match_score.desc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def list_with_jobs(
        self, recommendation_list_id: uuid.UUID
    ) -> list[tuple[RecommendationItem, Job]]:
        stmt = (
            select(RecommendationItem, Job)
            .join(Job, Job.id == RecommendationItem.job_id)
            .where(RecommendationItem.recommendation_list_id == recommendation_list_id)
            .order_by(RecommendationItem.match_score.desc())
        )
        result = await self.session.execute(stmt)
        return [(row[0], row[1]) for row in result.all()]
