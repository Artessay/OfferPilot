"""Job data-access repositories."""

from __future__ import annotations

import uuid

from sqlalchemy import ColumnElement, func, or_, select

from app.db.repository import BaseRepository
from app.modules.job.models import JOB_DELETED, Job, JobAnalysis


class JobRepository(BaseRepository[Job]):
    model = Job

    def _visible(self, user_id: uuid.UUID) -> ColumnElement[bool]:
        # A user can see their own jobs plus public/admin jobs (user_id IS NULL).
        return or_(Job.user_id == user_id, Job.user_id.is_(None))

    async def get_visible(self, job_id: uuid.UUID, user_id: uuid.UUID) -> Job | None:
        stmt = select(Job).where(Job.id == job_id, self._visible(user_id), Job.deleted_at.is_(None))
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_owned(self, job_id: uuid.UUID, user_id: uuid.UUID) -> Job | None:
        stmt = select(Job).where(Job.id == job_id, Job.user_id == user_id, Job.deleted_at.is_(None))
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def search(
        self,
        user_id: uuid.UUID,
        *,
        keyword: str | None,
        city: str | None,
        offset: int,
        limit: int,
    ) -> tuple[list[Job], int]:
        conditions: list[ColumnElement[bool]] = [self._visible(user_id), Job.deleted_at.is_(None)]
        if keyword:
            like = f"%{keyword}%"
            conditions.append(or_(Job.title.ilike(like), Job.company.ilike(like)))
        if city:
            conditions.append(Job.city == city)

        base = select(Job).where(*conditions)
        total_stmt = select(func.count()).select_from(base.subquery())
        total = int((await self.session.execute(total_stmt)).scalar_one())

        stmt = base.order_by(Job.created_at.desc()).offset(offset).limit(limit)
        items = list((await self.session.execute(stmt)).scalars().all())
        return items, total

    async def soft_delete(self, job: Job) -> None:
        from datetime import UTC, datetime

        job.status = JOB_DELETED
        job.deleted_at = datetime.now(UTC)
        await self.session.flush()

    async def discover_candidates(
        self,
        user_id: uuid.UUID,
        *,
        roles: list[str],
        cities: list[str],
        limit: int,
    ) -> list[Job]:
        """Find candidate jobs (own + public library) matching the filters."""
        conditions: list[ColumnElement[bool]] = [self._visible(user_id), Job.deleted_at.is_(None)]
        if roles:
            role_clauses = [Job.title.ilike(f"%{role}%") for role in roles if role]
            if role_clauses:
                conditions.append(or_(*role_clauses))
        if cities:
            conditions.append(Job.city.in_(cities))
        stmt = select(Job).where(*conditions).order_by(Job.created_at.desc()).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())


class JobAnalysisRepository(BaseRepository[JobAnalysis]):
    model = JobAnalysis

    async def get_for_job(self, job_id: uuid.UUID) -> JobAnalysis | None:
        stmt = (
            select(JobAnalysis)
            .where(JobAnalysis.job_id == job_id)
            .order_by(JobAnalysis.created_at.desc())
            .limit(1)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def delete_for_job(self, job_id: uuid.UUID) -> None:
        """Remove existing analyses so a re-parse replaces the current one."""
        from sqlalchemy import delete

        await self.session.execute(delete(JobAnalysis).where(JobAnalysis.job_id == job_id))
