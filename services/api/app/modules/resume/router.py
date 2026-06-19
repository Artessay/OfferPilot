"""Resume HTTP routes (upload, list, detail, versions, default, delete)."""

from __future__ import annotations

import uuid
from urllib.parse import quote

from fastapi import APIRouter, File, Form, Query, UploadFile, status
from fastapi.responses import Response

from app.modules.resume.schemas import (
    ResumeDetail,
    ResumeSummary,
    ResumeVersionCreate,
    ResumeVersionOut,
    ResumeVersionUpdate,
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


def _content_disposition(filename: str) -> str:
    """Build a Content-Disposition value that is safe for non-ASCII filenames."""
    ascii_fallback = filename.encode("ascii", "ignore").decode().strip()
    if not ascii_fallback or ascii_fallback.startswith("."):
        ascii_fallback = "resume"
    return f"attachment; filename=\"{ascii_fallback}\"; filename*=UTF-8''{quote(filename)}"


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


@router.patch(
    "/{resume_id}/analysis",
    response_model=Envelope[ResumeDetail],
    summary="更新简历解析结果",
)
async def update_analysis(
    resume_id: uuid.UUID,
    payload: ResumeVersionUpdate,
    user: CurrentUser,
    session: SessionDep,
) -> Envelope[ResumeDetail]:
    service = ResumeService(session)
    version = await service.update_analysis(
        user_id=user.id,
        resume_id=resume_id,
        fields_set=payload.model_fields_set,
        structured_data=payload.structured_data,
        skill_tags=payload.skill_tags,
        summary=payload.summary,
    )
    resume = await service.get_resume(user.id, resume_id)
    return envelope(_detail(resume, version))


@router.get(
    "/{resume_id}/download",
    summary="下载简历原件",
    response_class=Response,
)
async def download_resume(resume_id: uuid.UUID, user: CurrentUser, session: SessionDep) -> Response:
    content, media_type, filename = await ResumeService(session).download_original(
        user.id, resume_id
    )
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": _content_disposition(filename)},
    )


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


@router.get(
    "/{resume_id}/versions",
    response_model=Envelope[list[ResumeVersionOut]],
    summary="查询简历版本列表",
)
async def list_versions(
    resume_id: uuid.UUID, user: CurrentUser, session: SessionDep
) -> Envelope[list[ResumeVersionOut]]:
    versions = await ResumeService(session).list_versions(user.id, resume_id)
    return envelope([ResumeVersionOut.model_validate(v) for v in versions])


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
