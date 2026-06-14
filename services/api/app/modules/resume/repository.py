"""Resume data-access repositories."""

from __future__ import annotations

import uuid

from sqlalchemy import func, select, update

from app.db.repository import BaseRepository
from app.modules.resume.models import RESUME_DELETED, Resume, ResumeVersion


class ResumeRepository(BaseRepository[Resume]):
    model = Resume

    async def get_owned(self, resume_id: uuid.UUID, user_id: uuid.UUID) -> Resume | None:
        stmt = select(Resume).where(
            Resume.id == resume_id,
            Resume.user_id == user_id,
            Resume.deleted_at.is_(None),
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_for_user(self, user_id: uuid.UUID, *, offset: int, limit: int) -> list[Resume]:
        stmt = (
            select(Resume)
            .where(Resume.user_id == user_id, Resume.deleted_at.is_(None))
            .order_by(Resume.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_for_user(self, user_id: uuid.UUID) -> int:
        stmt = (
            select(func.count())
            .select_from(Resume)
            .where(Resume.user_id == user_id, Resume.deleted_at.is_(None))
        )
        result = await self.session.execute(stmt)
        return int(result.scalar_one())

    async def clear_default(self, user_id: uuid.UUID) -> None:
        await self.session.execute(
            update(Resume).where(Resume.user_id == user_id).values(is_default=False)
        )

    async def soft_delete(self, resume: Resume) -> None:
        from datetime import UTC, datetime

        resume.status = RESUME_DELETED
        resume.deleted_at = datetime.now(UTC)
        await self.session.flush()


class ResumeVersionRepository(BaseRepository[ResumeVersion]):
    model = ResumeVersion

    async def latest_for_resume(self, resume_id: uuid.UUID) -> ResumeVersion | None:
        stmt = (
            select(ResumeVersion)
            .where(ResumeVersion.resume_id == resume_id)
            .order_by(ResumeVersion.version_no.desc())
            .limit(1)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_for_resume(self, resume_id: uuid.UUID) -> list[ResumeVersion]:
        stmt = (
            select(ResumeVersion)
            .where(ResumeVersion.resume_id == resume_id)
            .order_by(ResumeVersion.version_no.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def next_version_no(self, resume_id: uuid.UUID) -> int:
        stmt = select(func.coalesce(func.max(ResumeVersion.version_no), 0)).where(
            ResumeVersion.resume_id == resume_id
        )
        result = await self.session.execute(stmt)
        return int(result.scalar_one()) + 1

    async def get_for_user(self, version_id: uuid.UUID, user_id: uuid.UUID) -> ResumeVersion | None:
        stmt = (
            select(ResumeVersion)
            .join(Resume, Resume.id == ResumeVersion.resume_id)
            .where(
                ResumeVersion.id == version_id,
                Resume.user_id == user_id,
                Resume.deleted_at.is_(None),
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
