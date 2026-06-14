"""Resume HTTP routes (upload, list, detail, versions, default, delete)."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, File, Form, Query, UploadFile, status

from app.modules.resume.schemas import (
    ResumeDetail,
    ResumeSummary,
    ResumeVersionCreate,
    ResumeVersionOut,
)
from app.modules.resume.service import ResumeService
from app.shared.deps import CurrentUser, SessionDep
from app.shared.responses import Envelope, Page, envelope, paginate

router = APIRouter(prefix="/resumes", tags=["resumes"])


def _detail(resume: object, version: object | None) -> ResumeDetail:
    detail = ResumeDetail.model_validate(resume)
    if version is not None:
        detail.latest_version = ResumeVersionOut.model_validate(version)
    return detail


@router.post(
    "",
    response_model=Envelope[ResumeDetail],
    status_code=status.HTTP_201_CREATED,
    summary="上传简历",
)
async def upload_resume(
    user: CurrentUser,
    session: SessionDep,
    file: UploadFile = File(...),
    title: str | None = Form(default=None),
    is_default: bool = Form(default=False, alias="isDefault"),
) -> Envelope[ResumeDetail]:
    data = await file.read()
    service = ResumeService(session)
    resume = await service.upload(
        user_id=user.id,
        filename=file.filename or "resume.txt",
        data=data,
        title=title,
        is_default=is_default,
    )
    version = await service.versions.latest_for_resume(resume.id)
    return envelope(_detail(resume, version))


@router.get("", response_model=Envelope[Page[ResumeSummary]], summary="查询简历列表")
async def list_resumes(
    user: CurrentUser,
    session: SessionDep,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100, alias="pageSize"),
) -> Envelope[Page[ResumeSummary]]:
    items, total = await ResumeService(session).list_resumes(
        user.id, offset=(page - 1) * page_size, limit=page_size
    )
    summaries = [ResumeSummary.model_validate(item) for item in items]
    return envelope(paginate(summaries, page=page, page_size=page_size, total=total))


@router.get("/{resume_id}", response_model=Envelope[ResumeDetail], summary="查询简历详情")
async def get_resume(
    resume_id: uuid.UUID, user: CurrentUser, session: SessionDep
) -> Envelope[ResumeDetail]:
    service = ResumeService(session)
    resume = await service.get_resume(user.id, resume_id)
    version = await service.versions.latest_for_resume(resume.id)
    return envelope(_detail(resume, version))


@router.get(
    "/{resume_id}/analysis",
    response_model=Envelope[ResumeVersionOut],
    summary="查询简历解析结果",
)
async def get_analysis(
    resume_id: uuid.UUID, user: CurrentUser, session: SessionDep
) -> Envelope[ResumeVersionOut]:
    version = await ResumeService(session).latest_version(user.id, resume_id)
    return envelope(ResumeVersionOut.model_validate(version))


@router.post(
    "/{resume_id}/versions",
    response_model=Envelope[ResumeVersionOut],
    status_code=status.HTTP_201_CREATED,
    summary="创建简历版本",
)
async def create_version(
    resume_id: uuid.UUID,
    payload: ResumeVersionCreate,
    user: CurrentUser,
    session: SessionDep,
) -> Envelope[ResumeVersionOut]:
    version = await ResumeService(session).create_manual_version(
        user_id=user.id,
        resume_id=resume_id,
        raw_text=payload.raw_text,
        source_report_id=payload.source_report_id,
        summary=payload.summary,
    )
    return envelope(ResumeVersionOut.model_validate(version))


@router.post(
    "/{resume_id}/default",
    response_model=Envelope[ResumeSummary],
    summary="设置默认简历",
)
async def set_default(
    resume_id: uuid.UUID, user: CurrentUser, session: SessionDep
) -> Envelope[ResumeSummary]:
    resume = await ResumeService(session).set_default(user.id, resume_id)
    return envelope(ResumeSummary.model_validate(resume))


@router.delete(
    "/{resume_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除简历",
)
async def delete_resume(resume_id: uuid.UUID, user: CurrentUser, session: SessionDep) -> None:
    await ResumeService(session).delete_resume(user.id, resume_id)
