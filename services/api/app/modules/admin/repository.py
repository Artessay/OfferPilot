"""Admin data-access repositories (prompts, scoring rules, users)."""

from __future__ import annotations

import uuid
from collections.abc import Sequence

from sqlalchemy import select, update

from app.db.repository import BaseRepository
from app.modules.admin.models import PromptTemplate, ScoringRule
from app.modules.auth.models import User


class PromptTemplateRepository(BaseRepository[PromptTemplate]):
    model = PromptTemplate

    async def list_all(self) -> Sequence[PromptTemplate]:
        stmt = select(PromptTemplate).order_by(
            PromptTemplate.name.asc(), PromptTemplate.version.asc()
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def deactivate_others(self, name: str, keep_id: uuid.UUID) -> None:
        """Mark every other version of ``name`` inactive (single active version)."""
        await self.session.execute(
            update(PromptTemplate)
            .where(PromptTemplate.name == name, PromptTemplate.id != keep_id)
            .values(is_active=False)
        )


class ScoringRuleRepository(BaseRepository[ScoringRule]):
    model = ScoringRule

    async def list_all(self) -> Sequence[ScoringRule]:
        stmt = select(ScoringRule).order_by(ScoringRule.name.asc(), ScoringRule.version.asc())
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def deactivate_others(self, name: str, keep_id: uuid.UUID) -> None:
        await self.session.execute(
            update(ScoringRule)
            .where(ScoringRule.name == name, ScoringRule.id != keep_id)
            .values(is_active=False)
        )


class UserRepository(BaseRepository[User]):
    model = User

    async def list_active(self, *, offset: int, limit: int) -> tuple[list[User], int]:
        from sqlalchemy import func

        base = select(User).where(User.deleted_at.is_(None))
        total = int(
            (
                await self.session.execute(select(func.count()).select_from(base.subquery()))
            ).scalar_one()
        )
        stmt = base.order_by(User.created_at.desc()).offset(offset).limit(limit)
        items = list((await self.session.execute(stmt)).scalars().all())
        return items, total
