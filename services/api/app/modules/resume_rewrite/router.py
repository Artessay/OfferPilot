"""Resume rewrite HTTP routes."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, status

from app.modules.resume_rewrite.schemas import (
    DiffBlockOut,
    RewriteConfirm,
    RewriteConfirmOut,
    RewriteCreate,
    RewriteTaskOut,
)
from app.modules.resume_rewrite.service import ResumeRewriteService
from app.shared.deps import CurrentUser, SessionDep
from app.shared.responses import Envelope, envelope

router = APIRouter(prefix="/resume-rewrites", tags=["resume-rewrites"])


@router.post(
    "",
    response_model=Envelope[RewriteTaskOut],
    status_code=status.HTTP_201_CREATED,
    summary="基于已采纳建议生成简历改写草稿",
)
async def create_rewrite(
    payload: RewriteCreate, user: CurrentUser, session: SessionDep
) -> Envelope[RewriteTaskOut]:
    task, diff_blocks, materials = await ResumeRewriteService(session).create_and_draft(
        user_id=user.id,
        resume_version_id=payload.resume_version_id,
        report_id=payload.report_id,
        suggestion_ids=payload.suggestion_ids,
    )
    return envelope(
        RewriteTaskOut(
            rewrite_task_id=task.id,
            status=task.status,
            diff_blocks=[
                DiffBlockOut(
                    section=b.section,
                    original=b.original,
                    rewritten=b.rewritten,
                    reason=b.reason,
                    risk_warning=b.risk_warning,
                )
                for b in diff_blocks
            ],
            materials_checklist=materials,
        )
    )


@router.get(
    "/{rewrite_task_id}",
    response_model=Envelope[RewriteTaskOut],
    summary="查询改写任务和差异结果",
)
async def get_rewrite(
    rewrite_task_id: uuid.UUID, user: CurrentUser, session: SessionDep
) -> Envelope[RewriteTaskOut]:
    task = await ResumeRewriteService(session).get_task(user.id, rewrite_task_id)
    diff_blocks = [
        DiffBlockOut(
            section=str(b.get("section", "")),
            original=str(b.get("original", "")),
            rewritten=str(b.get("rewritten", "")),
            reason=str(b.get("reason", "")),
            risk_warning=str(b.get("riskWarning", "")),
        )
        for b in task.diff_summary
    ]
    return envelope(
        RewriteTaskOut(
            rewrite_task_id=task.id,
            status=task.status,
            diff_blocks=diff_blocks,
            new_resume_version_id=task.new_resume_version_id,
        )
    )


@router.post(
    "/{rewrite_task_id}/confirm",
    response_model=Envelope[RewriteConfirmOut],
    summary="确认改写并生成新简历版本",
)
async def confirm_rewrite(
    rewrite_task_id: uuid.UUID,
    payload: RewriteConfirm,
    user: CurrentUser,
    session: SessionDep,
) -> Envelope[RewriteConfirmOut]:
    task = await ResumeRewriteService(session).confirm(
        user_id=user.id,
        rewrite_task_id=rewrite_task_id,
        edited_content=payload.edited_content,
        version_summary=payload.version_summary,
    )
    assert task.new_resume_version_id is not None
    return envelope(
        RewriteConfirmOut(new_resume_version_id=task.new_resume_version_id, status=task.status)
    )
