"""Job service: create, parse JD, update, search, delete."""

from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.orchestration import AIOrchestrator
from app.modules.job.models import JOB_PARSED, SOURCE_FILE, Job, JobAnalysis, JobFavorite
from app.modules.job.repository import (
    JobAnalysisRepository,
    JobFavoriteRepository,
    JobRepository,
)
from app.modules.job.schemas import JobCreate, JobUpdate
from app.shared.documents import normalize_text
from app.shared.errors import AppError, ErrorCode, NotFoundError

# Minimum JD length (chars) to be considered analysable (see design §2.4 / FR).
MIN_JD_LENGTH = 40


class JobService:
    def __init__(self, session: AsyncSession, orchestrator: AIOrchestrator | None = None) -> None:
        self.session = session
        self.jobs = JobRepository(session)
        self.analyses = JobAnalysisRepository(session)
        self.favorites = JobFavoriteRepository(session)
        self.orchestrator = orchestrator or AIOrchestrator()

    async def create(self, user_id: uuid.UUID, payload: JobCreate) -> Job:
        jd_text = normalize_text(payload.jd_text)
        if len(jd_text) < MIN_JD_LENGTH:
            raise AppError(ErrorCode.JD_TEXT_TOO_SHORT)
        job = Job(
            user_id=user_id,
            title=payload.title,
            company=payload.company,
            city=payload.city,
            source_type=payload.source_type,
            source_url=payload.source_url,
            jd_text=jd_text,
            status=JOB_PARSED,
        )
        await self.jobs.add(job)
        await self._analyse(job)
        return job

    async def import_from_file(
        self, user_id: uuid.UUID, filename: str, data: bytes
    ) -> tuple[list[Job], list[str]]:
        """Bulk-import jobs from a TXT/CSV/XLSX upload.

        Returns the successfully created jobs plus human-readable errors for
        rows that were skipped (missing fields, JD too short, parse failure).
        """
        from app.modules.job.importer import parse_jobs_from_file

        parsed = parse_jobs_from_file(filename, data)
        created: list[Job] = []
        errors = list(parsed.errors)
        for item in parsed.jobs:
            jd_text = normalize_text(item.jd_text)
            if len(jd_text) < MIN_JD_LENGTH:
                errors.append(f"「{item.title}」岗位描述过短，已跳过。")
                continue
            job = Job(
                user_id=user_id,
                title=item.title,
                company=item.company,
                city=item.city,
                source_type=SOURCE_FILE,
                jd_text=jd_text,
                status=JOB_PARSED,
            )
            await self.jobs.add(job)
            try:
                await self._analyse(job)
            except Exception:  # pragma: no cover - defensive per-row guard
                errors.append(f"「{item.title}」解析失败，已跳过。")
                continue
            created.append(job)
        return created, errors

    async def _analyse(self, job: Job) -> JobAnalysis:
        parsed = await self.orchestrator.parse_job(
            title=job.title, company=job.company, text=job.jd_text
        )
        # A job has one current JD analysis; replace any prior one.
        await self.analyses.delete_for_job(job.id)
        analysis = JobAnalysis(
            job_id=job.id,
            responsibilities=parsed["responsibilities"],
            requirements=parsed["requirements"],
            hard_skills=parsed["hard_skills"],
            soft_skills=parsed["soft_skills"],
            keywords=parsed["keywords"],
            bonus_points=parsed["bonus_points"],
            seniority_level=parsed["seniority_level"],
            embedding=parsed["embedding"],
            model_version=parsed["model_version"],
            prompt_version=parsed["prompt_version"],
        )
        await self.analyses.add(analysis)
        return analysis

    async def run_parse(self, job_id: uuid.UUID) -> JobAnalysis:
        job = await self.jobs.get(job_id)
        if job is None:
            raise AppError(ErrorCode.JOB_PARSE_FAILED)
        analysis = await self._analyse(job)
        job.status = JOB_PARSED
        await self.jobs.add(job)
        return analysis

    async def update(self, user_id: uuid.UUID, job_id: uuid.UUID, payload: JobUpdate) -> Job:
        job = await self._require_owned(job_id, user_id)
        data = payload.model_dump(exclude_unset=True, by_alias=False)
        jd_changed = False
        for field, value in data.items():
            if field == "jd_text" and value is not None:
                value = normalize_text(value)
                if len(value) < MIN_JD_LENGTH:
                    raise AppError(ErrorCode.JD_TEXT_TOO_SHORT)
                jd_changed = True
            setattr(job, field, value)
        await self.jobs.add(job)
        if jd_changed:
            await self._analyse(job)
        return job

    async def search(
        self,
        user_id: uuid.UUID,
        *,
        keyword: str | None,
        city: str | None,
        offset: int,
        limit: int,
    ) -> tuple[list[Job], int]:
        return await self.jobs.search(
            user_id, keyword=keyword, city=city, offset=offset, limit=limit
        )

    async def get_job(self, user_id: uuid.UUID, job_id: uuid.UUID) -> Job:
        job = await self.jobs.get_visible(job_id, user_id)
        if job is None:
            raise NotFoundError("岗位不存在。")
        return job

    async def get_analysis(self, user_id: uuid.UUID, job_id: uuid.UUID) -> JobAnalysis:
        await self.get_job(user_id, job_id)
        analysis = await self.analyses.get_for_job(job_id)
        if analysis is None:
            raise NotFoundError("岗位尚未解析。")
        return analysis

    async def delete_job(self, user_id: uuid.UUID, job_id: uuid.UUID) -> None:
        job = await self._require_owned(job_id, user_id)
        await self.jobs.soft_delete(job)

    # --- Favorites (V1.1: 岗位收藏) ---
    async def add_favorite(self, user_id: uuid.UUID, job_id: uuid.UUID) -> None:
        # Job must be visible (own or public) before it can be bookmarked.
        await self.get_job(user_id, job_id)
        existing = await self.favorites.get_by_user_job(user_id, job_id)
        if existing is None:
            await self.favorites.add(JobFavorite(user_id=user_id, job_id=job_id))

    async def remove_favorite(self, user_id: uuid.UUID, job_id: uuid.UUID) -> None:
        existing = await self.favorites.get_by_user_job(user_id, job_id)
        if existing is not None:
            await self.favorites.delete(existing)

    async def list_favorites(
        self, user_id: uuid.UUID, *, offset: int, limit: int
    ) -> tuple[list[Job], int]:
        return await self.favorites.list_jobs(user_id, offset=offset, limit=limit)

    async def favorite_job_ids(self, user_id: uuid.UUID) -> set[uuid.UUID]:
        return await self.favorites.list_job_ids(user_id)

    async def _require_owned(self, job_id: uuid.UUID, user_id: uuid.UUID) -> Job:
        job = await self.jobs.get_owned(job_id, user_id)
        if job is None:
            raise NotFoundError("岗位不存在或无权修改。")
        return job
