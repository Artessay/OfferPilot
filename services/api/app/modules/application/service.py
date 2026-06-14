"""Application service: track job applications and their status transitions."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.application.models import (
    STATUS_APPLIED,
    STATUS_CLOSED,
    STATUS_INTERESTED,
    STATUS_INTERVIEW,
    STATUS_OFFER,
    STATUS_REJECTED,
    STATUS_WRITTEN_TEST,
    ApplicationRecord,
)
from app.modules.application.repository import ApplicationRepository
from app.modules.application.schemas import (
    ApplicationCreate,
    ApplicationOut,
    ApplicationUpdate,
    JobRef,
)
from app.modules.job.models import Job
from app.modules.job.service import JobService
from app.shared.errors import AppError, ErrorCode, NotFoundError

# Statuses where the student has actually submitted an application. Used to
# stamp ``applied_at`` automatically the first time one is reached.
_SUBMITTED_STATUSES = frozenset(
    {
        STATUS_APPLIED,
        STATUS_WRITTEN_TEST,
        STATUS_INTERVIEW,
        STATUS_OFFER,
        STATUS_REJECTED,
    }
)

ALL_STATUSES = frozenset(
    {
        STATUS_INTERESTED,
        STATUS_APPLIED,
        STATUS_WRITTEN_TEST,
        STATUS_INTERVIEW,
        STATUS_OFFER,
        STATUS_REJECTED,
        STATUS_CLOSED,
    }
)


class ApplicationService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.records = ApplicationRepository(session)

    async def create(self, user_id: uuid.UUID, payload: ApplicationCreate) -> ApplicationOut:
        # Job must exist and be visible to the user (own or public library).
        job = await JobService(self.session).get_job(user_id, payload.job_id)

        existing = await self.records.get_by_job(user_id, payload.job_id)
        if existing is not None:
            raise AppError(ErrorCode.CONFLICT, "该岗位已在投递跟踪中。")

        status = payload.status or STATUS_INTERESTED
        if status not in ALL_STATUSES:
            raise AppError(ErrorCode.VALIDATION_ERROR, "无效的投递状态。")

        record = ApplicationRecord(
            user_id=user_id,
            job_id=payload.job_id,
            report_id=payload.report_id,
            status=status,
            note=payload.note,
            applied_at=datetime.now(UTC) if status in _SUBMITTED_STATUSES else None,
        )
        await self.records.add(record)
        return self._to_out(record, job)

    async def list(
        self, user_id: uuid.UUID, *, status: str | None, offset: int, limit: int
    ) -> tuple[list[ApplicationOut], int]:
        if status is not None and status not in ALL_STATUSES:
            raise AppError(ErrorCode.VALIDATION_ERROR, "无效的投递状态。")
        records, total = await self.records.search(
            user_id, status=status, offset=offset, limit=limit
        )
        job_map = await self._job_map([r.job_id for r in records])
        return [self._to_out(r, job_map.get(r.job_id)) for r in records], total

    async def get(self, user_id: uuid.UUID, record_id: uuid.UUID) -> ApplicationOut:
        record = await self._require_owned(record_id, user_id)
        job_map = await self._job_map([record.job_id])
        return self._to_out(record, job_map.get(record.job_id))

    async def update(
        self, user_id: uuid.UUID, record_id: uuid.UUID, payload: ApplicationUpdate
    ) -> ApplicationOut:
        record = await self._require_owned(record_id, user_id)
        if payload.status is not None:
            if payload.status not in ALL_STATUSES:
                raise AppError(ErrorCode.VALIDATION_ERROR, "无效的投递状态。")
            record.status = payload.status
            if payload.status in _SUBMITTED_STATUSES and record.applied_at is None:
                record.applied_at = datetime.now(UTC)
        if payload.note is not None:
            record.note = payload.note
        if payload.applied_at is not None:
            record.applied_at = payload.applied_at
        await self.records.add(record)
        job_map = await self._job_map([record.job_id])
        return self._to_out(record, job_map.get(record.job_id))

    async def delete(self, user_id: uuid.UUID, record_id: uuid.UUID) -> None:
        record = await self._require_owned(record_id, user_id)
        await self.records.delete(record)

    async def _require_owned(
        self, record_id: uuid.UUID, user_id: uuid.UUID
    ) -> ApplicationRecord:
        record = await self.records.get_owned(record_id, user_id)
        if record is None:
            raise NotFoundError("投递记录不存在。")
        return record

    async def _job_map(self, job_ids: list[uuid.UUID]) -> dict[uuid.UUID, Job]:
        if not job_ids:
            return {}
        stmt = select(Job).where(Job.id.in_(set(job_ids)))
        result = await self.session.execute(stmt)
        return {job.id: job for job in result.scalars().all()}

    @staticmethod
    def _to_out(record: ApplicationRecord, job: Job | None) -> ApplicationOut:
        job_ref = JobRef(
            job_id=record.job_id,
            title=job.title if job else "(岗位已删除)",
            company=job.company if job else None,
            city=job.city if job else None,
        )
        return ApplicationOut(
            id=record.id,
            job=job_ref,
            report_id=record.report_id,
            status=record.status,
            applied_at=record.applied_at,
            note=record.note,
            created_at=record.created_at,
            updated_at=record.updated_at,
        )
