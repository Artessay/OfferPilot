"""Recommendation HTTP routes."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, status

from app.modules.recommendation.schemas import RecommendationCreate, RecommendationOut
from app.modules.recommendation.service import RecommendationService
from app.shared.deps import CurrentUser, SessionDep
from app.shared.responses import Envelope, envelope

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.post(
    "/tiered",
    response_model=Envelope[RecommendationOut],
    status_code=status.HTTP_201_CREATED,
    summary="基于候选岗位生成分层岗位推荐组合",
)
async def create_tiered(
    payload: RecommendationCreate, user: CurrentUser, session: SessionDep
) -> Envelope[RecommendationOut]:
    service = RecommendationService(session)
    rec_list = await service.create_tiered(
        user_id=user.id,
        discovery_task_id=payload.discovery_task_id,
        resume_version_id=payload.resume_version_id,
        strategy=payload.strategy,
    )
    return envelope(await service.get_recommendation(user.id, rec_list.id))


@router.get(
    "/{recommendation_id}",
    response_model=Envelope[RecommendationOut],
    summary="查询分层岗位推荐结果",
)
async def get_recommendation(
    recommendation_id: uuid.UUID, user: CurrentUser, session: SessionDep
) -> Envelope[RecommendationOut]:
    detail = await RecommendationService(session).get_recommendation(user.id, recommendation_id)
    return envelope(detail)
