"""Application-record data-access repository."""

from __future__ import annotations

import uuid

from sqlalchemy import ColumnElement, func, select

from app.db.repository import BaseRepository
from app.modules.application.models import ApplicationRecord


class ApplicationRepository(BaseRepository[ApplicationRecord]):
    model = ApplicationRecord

    async def get_owned(self, record_id: uuid.UUID, user_id: uuid.UUID) -> ApplicationRecord | None:
        stmt = select(ApplicationRecord).where(
            ApplicationRecord.id == record_id, ApplicationRecord.user_id == user_id
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_job(self, user_id: uuid.UUID, job_id: uuid.UUID) -> ApplicationRecord | None:
        stmt = select(ApplicationRecord).where(
            ApplicationRecord.user_id == user_id, ApplicationRecord.job_id == job_id
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def search(
        self,
        user_id: uuid.UUID,
        *,
        status: str | None,
        offset: int,
        limit: int,
    ) -> tuple[list[ApplicationRecord], int]:
        conditions: list[ColumnElement[bool]] = [ApplicationRecord.user_id == user_id]
        if status:
            conditions.append(ApplicationRecord.status == status)

        base = select(ApplicationRecord).where(*conditions)
        total = int(
            (
                await self.session.execute(select(func.count()).select_from(base.subquery()))
            ).scalar_one()
        )
        stmt = base.order_by(ApplicationRecord.created_at.desc()).offset(offset).limit(limit)
        items = list((await self.session.execute(stmt)).scalars().all())
        return items, total
