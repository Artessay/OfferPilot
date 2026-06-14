"""Profile HTTP routes."""

from __future__ import annotations

from fastapi import APIRouter

from app.modules.profile.schemas import ProfileOut, ProfileUpdate, SkillSuggestions
from app.modules.profile.service import ProfileService
from app.shared.deps import CurrentUser, SessionDep
from app.shared.responses import Envelope, envelope

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("", response_model=Envelope[ProfileOut], summary="查询求职画像")
async def get_profile(user: CurrentUser, session: SessionDep) -> Envelope[ProfileOut]:
    profile = await ProfileService(session).get_or_create(user.id)
    return envelope(ProfileOut.model_validate(profile))


@router.put("", response_model=Envelope[ProfileOut], summary="更新求职画像")
async def update_profile(
    payload: ProfileUpdate, user: CurrentUser, session: SessionDep
) -> Envelope[ProfileOut]:
    profile = await ProfileService(session).update(user.id, payload)
    return envelope(ProfileOut.model_validate(profile))


@router.get(
    "/skills",
    response_model=Envelope[SkillSuggestions],
    summary="查询技能标签建议",
)
async def suggest_skills(user: CurrentUser, session: SessionDep) -> Envelope[SkillSuggestions]:
    skills = await ProfileService(session).suggest_skills(user.id)
    return envelope(SkillSuggestions(skills=skills))
