"""Job discovery data-access repositories."""

from __future__ import annotations

import uuid
from collections.abc import Sequence

from sqlalchemy import select

from app.db.repository import BaseRepository
from app.modules.job.models import Job
from app.modules.job_discovery.models import (
    DiscoveredJobCandidate,
    JobDiscoveryTask,
    JobSourceConfig,
)


class JobSourceConfigRepository(BaseRepository[JobSourceConfig]):
    model = JobSourceConfig

    async def list_for_user(self, user_id: uuid.UUID) -> Sequence[JobSourceConfig]:
        stmt = select(JobSourceConfig).where(JobSourceConfig.user_id == user_id)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_owned(self, source_id: uuid.UUID, user_id: uuid.UUID) -> JobSourceConfig | None:
        stmt = select(JobSourceConfig).where(
            JobSourceConfig.id == source_id, JobSourceConfig.user_id == user_id
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()


class JobDiscoveryTaskRepository(BaseRepository[JobDiscoveryTask]):
    model = JobDiscoveryTask

    async def get_owned(self, task_id: uuid.UUID, user_id: uuid.UUID) -> JobDiscoveryTask | None:
        stmt = select(JobDiscoveryTask).where(
            JobDiscoveryTask.id == task_id, JobDiscoveryTask.user_id == user_id
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()


class DiscoveredCandidateRepository(BaseRepository[DiscoveredJobCandidate]):
    model = DiscoveredJobCandidate

    async def list_with_jobs(
        self, discovery_task_id: uuid.UUID, *, tier: str | None = None
    ) -> list[tuple[DiscoveredJobCandidate, Job]]:
        stmt = (
            select(DiscoveredJobCandidate, Job)
            .join(Job, Job.id == DiscoveredJobCandidate.job_id)
            .where(DiscoveredJobCandidate.discovery_task_id == discovery_task_id)
            .order_by(DiscoveredJobCandidate.source_rank.asc())
        )
        result = await self.session.execute(stmt)
        return [(row[0], row[1]) for row in result.all()]
