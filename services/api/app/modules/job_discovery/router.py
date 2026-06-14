"""Job discovery HTTP routes."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, status

from app.modules.job_discovery.schemas import (
    AuthorizeRequest,
    CandidateOut,
    DiscoveryCreate,
    DiscoveryTaskOut,
    SourceConfigOut,
)
from app.modules.job_discovery.service import JobDiscoveryService
from app.shared.deps import CurrentUser, SessionDep
from app.shared.responses import Envelope, envelope

router = APIRouter(prefix="/job-discovery", tags=["job-discovery"])
sources_router = APIRouter(prefix="/job-sources", tags=["job-discovery"])


def _task_out(task: object) -> DiscoveryTaskOut:
    return DiscoveryTaskOut(
        discovery_task_id=task.id,  # type: ignore[attr-defined]
        status=task.status,  # type: ignore[attr-defined]
        candidate_count=task.candidate_count,  # type: ignore[attr-defined]
        error_code=task.error_code,  # type: ignore[attr-defined]
    )


@router.post(
    "/tasks",
    response_model=Envelope[DiscoveryTaskOut],
    status_code=status.HTTP_201_CREATED,
    summary="创建 AI 岗位发现任务",
)
async def create_task(
    payload: DiscoveryCreate, user: CurrentUser, session: SessionDep
) -> Envelope[DiscoveryTaskOut]:
    task = await JobDiscoveryService(session).create_and_run(user.id, payload)
    return envelope(_task_out(task))


@router.get(
    "/tasks/{task_id}",
    response_model=Envelope[DiscoveryTaskOut],
    summary="查询岗位发现任务状态",
)
async def get_task(
    task_id: uuid.UUID, user: CurrentUser, session: SessionDep
) -> Envelope[DiscoveryTaskOut]:
    task = await JobDiscoveryService(session).get_task(user.id, task_id)
    return envelope(_task_out(task))


@router.get(
    "/tasks/{task_id}/candidates",
    response_model=Envelope[list[CandidateOut]],
    summary="查询候选岗位列表",
)
async def list_candidates(
    task_id: uuid.UUID, user: CurrentUser, session: SessionDep
) -> Envelope[list[CandidateOut]]:
    rows = await JobDiscoveryService(session).list_candidates(user.id, task_id)
    candidates = [
        CandidateOut(
            id=candidate.id,
            job_id=job.id,
            title=job.title,
            company=job.company,
            city=job.city,
            initial_reason=candidate.initial_reason,
            eligibility_status=candidate.eligibility_status,
        )
        for candidate, job in rows
    ]
    return envelope(candidates)


@sources_router.get("", response_model=Envelope[list[SourceConfigOut]], summary="查询岗位数据源")
async def list_sources(user: CurrentUser, session: SessionDep) -> Envelope[list[SourceConfigOut]]:
    sources = await JobDiscoveryService(session).list_sources(user.id)
    return envelope([SourceConfigOut.model_validate(s) for s in sources])


@sources_router.post(
    "/authorize",
    response_model=Envelope[SourceConfigOut],
    status_code=status.HTTP_201_CREATED,
    summary="授权岗位数据源",
)
async def authorize_source(
    payload: AuthorizeRequest, user: CurrentUser, session: SessionDep
) -> Envelope[SourceConfigOut]:
    source = await JobDiscoveryService(session).authorize_source(user.id, payload)
    return envelope(SourceConfigOut.model_validate(source))
