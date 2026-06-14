"""Match HTTP routes."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, status

from app.modules.match.schemas import MatchCreate, MatchTaskOut
from app.modules.match.service import MatchService
from app.shared.deps import CurrentUser, SessionDep
from app.shared.responses import Envelope, envelope

router = APIRouter(prefix="/matches", tags=["matches"])


@router.post(
    "",
    response_model=Envelope[MatchTaskOut],
    status_code=status.HTTP_201_CREATED,
    summary="创建匹配任务",
)
async def create_match(
    payload: MatchCreate, user: CurrentUser, session: SessionDep
) -> Envelope[MatchTaskOut]:
    service = MatchService(session)
    task = await service.create_and_run(
        user_id=user.id,
        resume_version_id=payload.resume_version_id,
        job_id=payload.job_id,
        profile_id=payload.profile_id,
    )
    report_id = await service.report_id_for_task(task.id)
    return envelope(
        MatchTaskOut(
            match_task_id=task.id,
            status=task.status,
            progress=task.progress,
            report_id=report_id,
            error_code=task.error_code,
        )
    )


@router.get("/{match_task_id}", response_model=Envelope[MatchTaskOut], summary="查询任务状态")
async def get_match(
    match_task_id: uuid.UUID, user: CurrentUser, session: SessionDep
) -> Envelope[MatchTaskOut]:
    service = MatchService(session)
    task = await service.get_task(user.id, match_task_id)
    report_id = await service.report_id_for_task(task.id)
    return envelope(
        MatchTaskOut(
            match_task_id=task.id,
            status=task.status,
            progress=task.progress,
            report_id=report_id,
            error_code=task.error_code,
        )
    )
