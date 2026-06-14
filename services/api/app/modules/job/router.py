"""Job HTTP routes."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Query, status

from app.modules.job.schemas import (
    JobAnalysisOut,
    JobCreate,
    JobDetail,
    JobSummary,
    JobUpdate,
)
from app.modules.job.service import JobService
from app.shared.deps import CurrentUser, SessionDep
from app.shared.responses import Envelope, Page, envelope, paginate

router = APIRouter(prefix="/jobs", tags=["jobs"])


async def _detail(service: JobService, user_id: uuid.UUID, job: object) -> JobDetail:
    detail = JobDetail.model_validate(job)
    analysis = await service.analyses.get_for_job(job.id)  # type: ignore[attr-defined]
    if analysis is not None:
        detail.analysis = JobAnalysisOut.model_validate(analysis)
    return detail


@router.post(
    "",
    response_model=Envelope[JobDetail],
    status_code=status.HTTP_201_CREATED,
    summary="创建岗位/JD",
)
async def create_job(
    payload: JobCreate, user: CurrentUser, session: SessionDep
) -> Envelope[JobDetail]:
    service = JobService(session)
    job = await service.create(user.id, payload)
    return envelope(await _detail(service, user.id, job))


@router.get("", response_model=Envelope[Page[JobSummary]], summary="查询岗位列表")
async def list_jobs(
    user: CurrentUser,
    session: SessionDep,
    keyword: str | None = Query(default=None),
    city: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100, alias="pageSize"),
) -> Envelope[Page[JobSummary]]:
    items, total = await JobService(session).search(
        user.id, keyword=keyword, city=city, offset=(page - 1) * page_size, limit=page_size
    )
    summaries = [JobSummary.model_validate(item) for item in items]
    return envelope(paginate(summaries, page=page, page_size=page_size, total=total))


@router.get("/{job_id}", response_model=Envelope[JobDetail], summary="查询岗位详情")
async def get_job(job_id: uuid.UUID, user: CurrentUser, session: SessionDep) -> Envelope[JobDetail]:
    service = JobService(session)
    job = await service.get_job(user.id, job_id)
    return envelope(await _detail(service, user.id, job))


@router.put("/{job_id}", response_model=Envelope[JobDetail], summary="更新岗位")
async def update_job(
    job_id: uuid.UUID, payload: JobUpdate, user: CurrentUser, session: SessionDep
) -> Envelope[JobDetail]:
    service = JobService(session)
    job = await service.update(user.id, job_id, payload)
    return envelope(await _detail(service, user.id, job))


@router.get(
    "/{job_id}/analysis",
    response_model=Envelope[JobAnalysisOut],
    summary="查询 JD 解析结果",
)
async def get_analysis(
    job_id: uuid.UUID, user: CurrentUser, session: SessionDep
) -> Envelope[JobAnalysisOut]:
    analysis = await JobService(session).get_analysis(user.id, job_id)
    return envelope(JobAnalysisOut.model_validate(analysis))


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT, summary="删除岗位")
async def delete_job(job_id: uuid.UUID, user: CurrentUser, session: SessionDep) -> None:
    await JobService(session).delete_job(user.id, job_id)
