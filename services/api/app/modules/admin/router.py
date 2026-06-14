"""Admin HTTP routes (prompts, scoring rules, public jobs, users).

All routes require an admin account via the :data:`AdminUser` dependency.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Query, status

from app.modules.admin.schemas import (
    AdminJobCreate,
    PromptTemplateCreate,
    PromptTemplateOut,
    PromptTemplateUpdate,
    ScoringRuleCreate,
    ScoringRuleOut,
    ScoringRuleUpdate,
    UserSummary,
)
from app.modules.admin.service import AdminService
from app.modules.job.schemas import JobSummary
from app.shared.deps import AdminUser, SessionDep
from app.shared.responses import Envelope, Page, envelope, paginate

router = APIRouter(prefix="/admin", tags=["admin"])


# --- Prompt templates ---
@router.get(
    "/prompts",
    response_model=Envelope[list[PromptTemplateOut]],
    summary="提示词模板列表",
)
async def list_prompts(_: AdminUser, session: SessionDep) -> Envelope[list[PromptTemplateOut]]:
    items = await AdminService(session).list_prompts()
    return envelope([PromptTemplateOut.model_validate(i) for i in items])


@router.post(
    "/prompts",
    response_model=Envelope[PromptTemplateOut],
    status_code=status.HTTP_201_CREATED,
    summary="创建提示词模板",
)
async def create_prompt(
    payload: PromptTemplateCreate, _: AdminUser, session: SessionDep
) -> Envelope[PromptTemplateOut]:
    item = await AdminService(session).create_prompt(payload)
    return envelope(PromptTemplateOut.model_validate(item))


@router.patch(
    "/prompts/{prompt_id}",
    response_model=Envelope[PromptTemplateOut],
    summary="更新提示词模板",
)
async def update_prompt(
    prompt_id: uuid.UUID,
    payload: PromptTemplateUpdate,
    _: AdminUser,
    session: SessionDep,
) -> Envelope[PromptTemplateOut]:
    item = await AdminService(session).update_prompt(prompt_id, payload)
    return envelope(PromptTemplateOut.model_validate(item))


@router.post(
    "/prompts/{prompt_id}/activate",
    response_model=Envelope[PromptTemplateOut],
    summary="启用该版本提示词",
)
async def activate_prompt(
    prompt_id: uuid.UUID, _: AdminUser, session: SessionDep
) -> Envelope[PromptTemplateOut]:
    item = await AdminService(session).activate_prompt(prompt_id)
    return envelope(PromptTemplateOut.model_validate(item))


@router.delete(
    "/prompts/{prompt_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除提示词模板",
)
async def delete_prompt(prompt_id: uuid.UUID, _: AdminUser, session: SessionDep) -> None:
    await AdminService(session).delete_prompt(prompt_id)


# --- Scoring rules ---
@router.get(
    "/scoring-rules",
    response_model=Envelope[list[ScoringRuleOut]],
    summary="评分规则列表",
)
async def list_rules(_: AdminUser, session: SessionDep) -> Envelope[list[ScoringRuleOut]]:
    items = await AdminService(session).list_rules()
    return envelope([ScoringRuleOut.model_validate(i) for i in items])


@router.post(
    "/scoring-rules",
    response_model=Envelope[ScoringRuleOut],
    status_code=status.HTTP_201_CREATED,
    summary="创建评分规则",
)
async def create_rule(
    payload: ScoringRuleCreate, _: AdminUser, session: SessionDep
) -> Envelope[ScoringRuleOut]:
    item = await AdminService(session).create_rule(payload)
    return envelope(ScoringRuleOut.model_validate(item))


@router.patch(
    "/scoring-rules/{rule_id}",
    response_model=Envelope[ScoringRuleOut],
    summary="更新评分规则",
)
async def update_rule(
    rule_id: uuid.UUID,
    payload: ScoringRuleUpdate,
    _: AdminUser,
    session: SessionDep,
) -> Envelope[ScoringRuleOut]:
    item = await AdminService(session).update_rule(rule_id, payload)
    return envelope(ScoringRuleOut.model_validate(item))


@router.post(
    "/scoring-rules/{rule_id}/activate",
    response_model=Envelope[ScoringRuleOut],
    summary="启用该版本评分规则",
)
async def activate_rule(
    rule_id: uuid.UUID, _: AdminUser, session: SessionDep
) -> Envelope[ScoringRuleOut]:
    item = await AdminService(session).activate_rule(rule_id)
    return envelope(ScoringRuleOut.model_validate(item))


@router.delete(
    "/scoring-rules/{rule_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除评分规则",
)
async def delete_rule(rule_id: uuid.UUID, _: AdminUser, session: SessionDep) -> None:
    await AdminService(session).delete_rule(rule_id)


# --- Public job library ---
@router.get(
    "/jobs",
    response_model=Envelope[Page[JobSummary]],
    summary="公共岗位库列表",
)
async def list_public_jobs(
    _: AdminUser,
    session: SessionDep,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100, alias="pageSize"),
) -> Envelope[Page[JobSummary]]:
    items, total = await AdminService(session).list_public_jobs(
        offset=(page - 1) * page_size, limit=page_size
    )
    summaries = [JobSummary.model_validate(i) for i in items]
    return envelope(paginate(summaries, page=page, page_size=page_size, total=total))


@router.post(
    "/jobs",
    response_model=Envelope[JobSummary],
    status_code=status.HTTP_201_CREATED,
    summary="新增公共岗位",
)
async def create_public_job(
    payload: AdminJobCreate, _: AdminUser, session: SessionDep
) -> Envelope[JobSummary]:
    job = await AdminService(session).create_public_job(payload)
    return envelope(JobSummary.model_validate(job))


@router.delete(
    "/jobs/{job_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除公共岗位",
)
async def delete_public_job(job_id: uuid.UUID, _: AdminUser, session: SessionDep) -> None:
    await AdminService(session).delete_public_job(job_id)


# --- Users ---
@router.get(
    "/users",
    response_model=Envelope[Page[UserSummary]],
    summary="用户列表",
)
async def list_users(
    _: AdminUser,
    session: SessionDep,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100, alias="pageSize"),
) -> Envelope[Page[UserSummary]]:
    items, total = await AdminService(session).list_users(
        offset=(page - 1) * page_size, limit=page_size
    )
    summaries = [UserSummary.model_validate(i) for i in items]
    return envelope(paginate(summaries, page=page, page_size=page_size, total=total))
