"""Profile data-access repository."""

from __future__ import annotations

import uuid

from sqlalchemy import select

from app.db.repository import BaseRepository
from app.modules.profile.models import Profile


class ProfileRepository(BaseRepository[Profile]):
    model = Profile

    async def get_by_user(self, user_id: uuid.UUID) -> Profile | None:
        stmt = select(Profile).where(Profile.user_id == user_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
