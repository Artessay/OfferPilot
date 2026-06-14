"""User data-access repository."""

from __future__ import annotations

from sqlalchemy import select

from app.db.repository import BaseRepository
from app.modules.auth.models import User


class UserRepository(BaseRepository[User]):
    model = User

    async def get_by_email(self, email: str) -> User | None:
        stmt = select(User).where(User.email == email, User.deleted_at.is_(None))
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
