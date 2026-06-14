"""Profile service: get-or-create, update, skill suggestions."""

from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.skills import HARD_SKILLS
from app.modules.profile.models import Profile
from app.modules.profile.repository import ProfileRepository
from app.modules.profile.schemas import ProfileUpdate


class ProfileService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.profiles = ProfileRepository(session)

    async def get_or_create(self, user_id: uuid.UUID) -> Profile:
        profile = await self.profiles.get_by_user(user_id)
        if profile is None:
            profile = Profile(user_id=user_id)
            await self.profiles.add(profile)
        return profile

    async def update(self, user_id: uuid.UUID, payload: ProfileUpdate) -> Profile:
        profile = await self.get_or_create(user_id)
        data = payload.model_dump(exclude_unset=True, by_alias=False)
        for field, value in data.items():
            setattr(profile, field, value)
        await self.profiles.add(profile)
        return profile

    async def suggest_skills(self, user_id: uuid.UUID) -> list[str]:
        """Suggest skills relevant to the profile's target roles."""
        profile = await self.get_or_create(user_id)
        target_text = " ".join(profile.target_roles + profile.industries).lower()
        existing = {s.lower() for s in profile.skills}
        suggestions: list[str] = []
        for canonical, aliases in HARD_SKILLS.items():
            if canonical.lower() in existing:
                continue
            if any(alias.lower() in target_text for alias in [canonical, *aliases]):
                suggestions.append(canonical)
        # Fall back to a sensible default starter set when nothing matches.
        if not suggestions:
            suggestions = ["SQL", "Python", "Excel", "数据分析", "沟通能力"]
        return suggestions[:10]
