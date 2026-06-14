"""Admin service: manage prompt templates, scoring rules, public jobs, users."""

from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.admin.models import PromptTemplate, ScoringRule
from app.modules.admin.repository import (
    PromptTemplateRepository,
    ScoringRuleRepository,
    UserRepository,
)
from app.modules.admin.schemas import (
    AdminJobCreate,
    PromptTemplateCreate,
    PromptTemplateUpdate,
    ScoringRuleCreate,
    ScoringRuleUpdate,
)
from app.modules.auth.models import User
from app.modules.job.models import SOURCE_ADMIN, Job
from app.modules.job.repository import JobRepository
from app.modules.job.service import JobService
from app.shared.errors import NotFoundError


class AdminService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.prompts = PromptTemplateRepository(session)
        self.rules = ScoringRuleRepository(session)
        self.users = UserRepository(session)
        self.jobs = JobRepository(session)

    # --- Prompt templates ---
    async def list_prompts(self) -> list[PromptTemplate]:
        return list(await self.prompts.list_all())

    async def create_prompt(self, payload: PromptTemplateCreate) -> PromptTemplate:
        prompt = PromptTemplate(
            name=payload.name,
            version=payload.version,
            content=payload.content,
            schema_version=payload.schema_version,
            is_active=payload.is_active,
        )
        await self.prompts.add(prompt)
        if prompt.is_active:
            await self.prompts.deactivate_others(prompt.name, prompt.id)
        return prompt

    async def update_prompt(
        self, prompt_id: uuid.UUID, payload: PromptTemplateUpdate
    ) -> PromptTemplate:
        prompt = await self.prompts.get(prompt_id)
        if prompt is None:
            raise NotFoundError("提示词模板不存在。")
        if payload.content is not None:
            prompt.content = payload.content
        if payload.schema_version is not None:
            prompt.schema_version = payload.schema_version
        if payload.is_active is not None:
            prompt.is_active = payload.is_active
        await self.prompts.add(prompt)
        if prompt.is_active:
            await self.prompts.deactivate_others(prompt.name, prompt.id)
        return prompt

    async def activate_prompt(self, prompt_id: uuid.UUID) -> PromptTemplate:
        prompt = await self.prompts.get(prompt_id)
        if prompt is None:
            raise NotFoundError("提示词模板不存在。")
        prompt.is_active = True
        await self.prompts.add(prompt)
        await self.prompts.deactivate_others(prompt.name, prompt.id)
        return prompt

    async def delete_prompt(self, prompt_id: uuid.UUID) -> None:
        prompt = await self.prompts.get(prompt_id)
        if prompt is None:
            raise NotFoundError("提示词模板不存在。")
        await self.prompts.delete(prompt)

    # --- Scoring rules ---
    async def list_rules(self) -> list[ScoringRule]:
        return list(await self.rules.list_all())

    async def create_rule(self, payload: ScoringRuleCreate) -> ScoringRule:
        rule = ScoringRule(
            name=payload.name,
            version=payload.version,
            weights=payload.weights,
            is_active=payload.is_active,
        )
        await self.rules.add(rule)
        if rule.is_active:
            await self.rules.deactivate_others(rule.name, rule.id)
        return rule

    async def update_rule(self, rule_id: uuid.UUID, payload: ScoringRuleUpdate) -> ScoringRule:
        rule = await self.rules.get(rule_id)
        if rule is None:
            raise NotFoundError("评分规则不存在。")
        if payload.weights is not None:
            rule.weights = payload.weights
        if payload.is_active is not None:
            rule.is_active = payload.is_active
        await self.rules.add(rule)
        if rule.is_active:
            await self.rules.deactivate_others(rule.name, rule.id)
        return rule

    async def activate_rule(self, rule_id: uuid.UUID) -> ScoringRule:
        rule = await self.rules.get(rule_id)
        if rule is None:
            raise NotFoundError("评分规则不存在。")
        rule.is_active = True
        await self.rules.add(rule)
        await self.rules.deactivate_others(rule.name, rule.id)
        return rule

    async def delete_rule(self, rule_id: uuid.UUID) -> None:
        rule = await self.rules.get(rule_id)
        if rule is None:
            raise NotFoundError("评分规则不存在。")
        await self.rules.delete(rule)

    # --- Public job library ---
    async def list_public_jobs(self, *, offset: int, limit: int) -> tuple[list[Job], int]:
        from sqlalchemy import func, select

        base = select(Job).where(Job.user_id.is_(None), Job.deleted_at.is_(None))
        total = int(
            (
                await self.session.execute(select(func.count()).select_from(base.subquery()))
            ).scalar_one()
        )
        stmt = base.order_by(Job.created_at.desc()).offset(offset).limit(limit)
        items = list((await self.session.execute(stmt)).scalars().all())
        return items, total

    async def create_public_job(self, payload: AdminJobCreate) -> Job:
        from app.modules.job.schemas import JobCreate

        # Reuse JobService parsing, then detach from any owner (public library).
        service = JobService(self.session)
        job = await service.create(
            user_id=None,  # type: ignore[arg-type]
            payload=JobCreate(
                title=payload.title,
                company=payload.company,
                city=payload.city,
                jd_text=payload.jd_text,
                source_type=SOURCE_ADMIN,
            ),
        )
        return job

    async def delete_public_job(self, job_id: uuid.UUID) -> None:
        job = await self.jobs.get(job_id)
        if job is None or job.user_id is not None:
            raise NotFoundError("岗位不存在。")
        await self.jobs.soft_delete(job)

    # --- Users ---
    async def list_users(self, *, offset: int, limit: int) -> tuple[list[User], int]:
        return await self.users.list_active(offset=offset, limit=limit)
