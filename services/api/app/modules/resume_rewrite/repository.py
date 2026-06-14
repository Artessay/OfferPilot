"""Resume rewrite task data-access repository."""

from __future__ import annotations

import uuid

from sqlalchemy import select

from app.db.repository import BaseRepository
from app.modules.resume_rewrite.models import ResumeRewriteTask


class ResumeRewriteTaskRepository(BaseRepository[ResumeRewriteTask]):
    model = ResumeRewriteTask

    async def get_owned(self, task_id: uuid.UUID, user_id: uuid.UUID) -> ResumeRewriteTask | None:
        stmt = select(ResumeRewriteTask).where(
            ResumeRewriteTask.id == task_id, ResumeRewriteTask.user_id == user_id
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
