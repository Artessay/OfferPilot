"""Match task data-access repository."""

from __future__ import annotations

import uuid

from sqlalchemy import select

from app.db.repository import BaseRepository
from app.modules.match.models import MatchTask


class MatchTaskRepository(BaseRepository[MatchTask]):
    model = MatchTask

    async def get_owned(self, task_id: uuid.UUID, user_id: uuid.UUID) -> MatchTask | None:
        stmt = select(MatchTask).where(MatchTask.id == task_id, MatchTask.user_id == user_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
