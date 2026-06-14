"""Job discovery service: source authorization, candidate discovery."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.skills import extract_hard_skills
from app.modules.job.models import Job
from app.modules.job.repository import JobAnalysisRepository, JobRepository
from app.modules.job.service import JobService
from app.modules.job_discovery.models import (
    AUTH_AUTHORIZED,
    ELIGIBLE,
    SOURCE_ADMIN,
    TASK_SUCCEEDED,
    DiscoveredJobCandidate,
    JobDiscoveryTask,
    JobSourceConfig,
)
from app.modules.job_discovery.repository import (
    DiscoveredCandidateRepository,
    JobDiscoveryTaskRepository,
    JobSourceConfigRepository,
)
from app.modules.job_discovery.schemas import AuthorizeRequest, DiscoveryCreate
from app.modules.profile.repository import ProfileRepository
from app.modules.resume.models import ResumeVersion
from app.modules.resume.repository import ResumeRepository, ResumeVersionRepository
from app.shared.errors import AppError, ErrorCode, NotFoundError

DEFAULT_SOURCE_NAME = "平台演示岗位库"


class JobDiscoveryService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.sources = JobSourceConfigRepository(session)
        self.tasks = JobDiscoveryTaskRepository(session)
        self.candidates = DiscoveredCandidateRepository(session)
        self.jobs = JobRepository(session)
        self.job_analyses = JobAnalysisRepository(session)
        self.profiles = ProfileRepository(session)
        self.resumes = ResumeRepository(session)
        self.resume_versions = ResumeVersionRepository(session)

    async def ensure_default_source(self, user_id: uuid.UUID) -> JobSourceConfig:
        for source in await self.sources.list_for_user(user_id):
            if source.source_name == DEFAULT_SOURCE_NAME:
                return source
        source = JobSourceConfig(
            user_id=user_id,
            source_type=SOURCE_ADMIN,
            source_name=DEFAULT_SOURCE_NAME,
            auth_status=AUTH_AUTHORIZED,
            scope={},
            last_synced_at=datetime.now(UTC),
        )
        await self.sources.add(source)
        return source

    async def list_sources(self, user_id: uuid.UUID) -> list[JobSourceConfig]:
        await self.ensure_default_source(user_id)
        return list(await self.sources.list_for_user(user_id))

    async def authorize_source(
        self, user_id: uuid.UUID, payload: AuthorizeRequest
    ) -> JobSourceConfig:
        source = JobSourceConfig(
            user_id=user_id,
            source_type=payload.source_type,
            source_name=payload.source_name,
            auth_status=AUTH_AUTHORIZED,
            scope=payload.scope,
            last_synced_at=datetime.now(UTC),
        )
        await self.sources.add(source)
        return source

    async def create_and_run(
        self, user_id: uuid.UUID, payload: DiscoveryCreate
    ) -> JobDiscoveryTask:
        resume_version = await self._resolve_resume_version(user_id, payload.resume_version_id)
        await self._validate_sources(user_id, payload.source_ids)
        profile = await self.profiles.get_by_user(user_id)

        roles = payload.filters.target_roles or (profile.target_roles if profile else [])
        cities = payload.filters.cities or (profile.target_cities if profile else [])

        task = JobDiscoveryTask(
            user_id=user_id,
            profile_id=profile.id if profile else None,
            resume_version_id=resume_version.id if resume_version else None,
            source_ids=[str(s) for s in payload.source_ids],
            filters=payload.filters.model_dump(by_alias=True),
            status=TASK_SUCCEEDED,
        )
        await self.tasks.add(task)

        jobs = await self.jobs.discover_candidates(
            user_id, roles=roles, cities=cities, limit=payload.filters.max_candidates
        )
        resume_skills = set(resume_version.skill_tags) if resume_version else set()
        for rank, job in enumerate(jobs):
            await self._ensure_analysis(job.id)
            reason = self._initial_reason(job.title, resume_skills, roles)
            self.session.add(
                DiscoveredJobCandidate(
                    discovery_task_id=task.id,
                    job_id=job.id,
                    source_rank=rank,
                    initial_reason=reason,
                    eligibility_status=ELIGIBLE,
                )
            )
        task.candidate_count = len(jobs)
        task.finished_at = datetime.now(UTC)
        await self.tasks.add(task)
        await self.session.flush()
        return task

    async def get_task(self, user_id: uuid.UUID, task_id: uuid.UUID) -> JobDiscoveryTask:
        task = await self.tasks.get_owned(task_id, user_id)
        if task is None:
            raise AppError(ErrorCode.TASK_NOT_FOUND)
        return task

    async def list_candidates(
        self, user_id: uuid.UUID, task_id: uuid.UUID
    ) -> list[tuple[DiscoveredJobCandidate, Job]]:
        await self.get_task(user_id, task_id)
        return list(await self.candidates.list_with_jobs(task_id))

    async def _resolve_resume_version(
        self, user_id: uuid.UUID, resume_version_id: uuid.UUID | None
    ) -> ResumeVersion | None:
        if resume_version_id is not None:
            version = await self.resume_versions.get_for_user(resume_version_id, user_id)
            if version is None:
                raise NotFoundError("简历版本不存在。")
            return version
        # Fall back to the latest version of the user's default resume.
        resumes = await self.resumes.list_for_user(user_id, offset=0, limit=50)
        default = next((r for r in resumes if r.is_default), resumes[0] if resumes else None)
        if default is None:
            return None
        return await self.resume_versions.latest_for_resume(default.id)

    async def _validate_sources(self, user_id: uuid.UUID, source_ids: list[uuid.UUID]) -> None:
        if not source_ids:
            await self.ensure_default_source(user_id)
            return
        for source_id in source_ids:
            source = await self.sources.get_owned(source_id, user_id)
            if source is None or source.auth_status != AUTH_AUTHORIZED:
                raise AppError(ErrorCode.JOB_SOURCE_UNAUTHORIZED)

    async def _ensure_analysis(self, job_id: uuid.UUID) -> None:
        analysis = await self.job_analyses.get_for_job(job_id)
        if analysis is None:
            await JobService(self.session).run_parse(job_id)

    @staticmethod
    def _initial_reason(title: str, resume_skills: set[str], roles: list[str]) -> str:
        title_skills = set(extract_hard_skills(title))
        overlap = resume_skills & title_skills
        if overlap:
            return f"技能匹配：{'、'.join(sorted(overlap))}"
        hit_role = next((r for r in roles if r and r in title), None)
        if hit_role:
            return f"命中目标方向：{hit_role}"
        return "符合检索条件的候选岗位"
