"""Report HTTP routes."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Query

from app.modules.report.schemas import (
    RegenerateRequest,
    ReportDetail,
    ReportSummary,
    SuggestionOut,
    SuggestionUpdate,
)
from app.modules.report.service import ReportService
from app.shared.deps import CurrentUser, SessionDep
from app.shared.responses import Envelope, Page, envelope, paginate

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("", response_model=Envelope[Page[ReportSummary]], summary="查询报告列表")
async def list_reports(
    user: CurrentUser,
    session: SessionDep,
    job_id: uuid.UUID | None = Query(default=None, alias="jobId"),
    resume_id: uuid.UUID | None = Query(default=None, alias="resumeVersionId"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100, alias="pageSize"),
) -> Envelope[Page[ReportSummary]]:
    items, total = await ReportService(session).list_reports(
        user.id,
        job_id=job_id,
        resume_version_id=resume_id,
        offset=(page - 1) * page_size,
        limit=page_size,
    )
    summaries = [ReportSummary.model_validate(item) for item in items]
    return envelope(paginate(summaries, page=page, page_size=page_size, total=total))


@router.get("/{report_id}", response_model=Envelope[ReportDetail], summary="查询报告详情")
async def get_report(
    report_id: uuid.UUID, user: CurrentUser, session: SessionDep
) -> Envelope[ReportDetail]:
    detail = await ReportService(session).get_report(user.id, report_id)
    return envelope(detail)


@router.post(
    "/{report_id}/suggestions/regenerate",
    response_model=Envelope[list[SuggestionOut]],
    summary="重新生成建议",
)
async def regenerate_suggestions(
    report_id: uuid.UUID,
    user: CurrentUser,
    session: SessionDep,
    _payload: RegenerateRequest | None = None,
) -> Envelope[list[SuggestionOut]]:
    suggestions = await ReportService(session).regenerate_suggestions(user.id, report_id)
    return envelope([SuggestionOut.model_validate(s) for s in suggestions])


# Suggestion status updates live under their own path.
suggestions_router = APIRouter(prefix="/suggestions", tags=["reports"])


@suggestions_router.patch(
    "/{suggestion_id}",
    response_model=Envelope[SuggestionOut],
    summary="更新建议状态",
)
async def update_suggestion(
    suggestion_id: uuid.UUID,
    payload: SuggestionUpdate,
    user: CurrentUser,
    session: SessionDep,
) -> Envelope[SuggestionOut]:
    suggestion = await ReportService(session).update_suggestion_status(
        user.id, suggestion_id, payload.status, payload.note
    )
    return envelope(SuggestionOut.model_validate(suggestion))
