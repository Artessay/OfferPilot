"""Match service: orchestrates scoring and report generation.

For the MVP the scoring pipeline is fast and deterministic, so a match runs
inline within the request (queued -> running -> succeeded). The same
``run`` logic can be invoked from the Arq worker for heavier LLM-backed
scoring without changing callers.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.scoring.engine import MatchScorer, ScoreInputs
from app.ai.scoring.suggestions import generate_suggestions
from app.modules.job.repository import JobAnalysisRepository, JobRepository
from app.modules.match.models import (
    MATCH_FAILED,
    MATCH_RUNNING,
    MATCH_SUCCEEDED,
    MatchTask,
)
from app.modules.match.repository import MatchTaskRepository
from app.modules.profile.repository import ProfileRepository
from app.modules.report.repository import MatchReportRepository
from app.modules.report.service import ReportService
from app.modules.resume.repository import ResumeVersionRepository
from app.shared.errors import AppError, ErrorCode, NotFoundError


class MatchService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.tasks = MatchTaskRepository(session)
        self.resume_versions = ResumeVersionRepository(session)
        self.jobs = JobRepository(session)
        self.job_analyses = JobAnalysisRepository(session)
        self.profiles = ProfileRepository(session)
        self.reports = MatchReportRepository(session)

    async def create_and_run(
        self,
        *,
        user_id: uuid.UUID,
        resume_version_id: uuid.UUID,
        job_id: uuid.UUID,
        profile_id: uuid.UUID | None = None,
    ) -> MatchTask:
        resume_version = await self.resume_versions.get_for_user(resume_version_id, user_id)
        if resume_version is None:
            raise NotFoundError("简历版本不存在。")
        job = await self.jobs.get_visible(job_id, user_id)
        if job is None:
            raise NotFoundError("岗位不存在。")
        analysis = await self.job_analyses.get_for_job(job_id)
        if analysis is None:
            raise AppError(ErrorCode.MATCH_INPUT_INCOMPLETE)

        task = MatchTask(
            user_id=user_id,
            resume_version_id=resume_version_id,
            job_id=job_id,
            status=MATCH_RUNNING,
            progress=10,
            started_at=datetime.now(UTC),
        )
        await self.tasks.add(task)

        try:
            target_cities: list[str] = []
            profile = await self.profiles.get_by_user(user_id)
            if profile is not None:
                target_cities = profile.target_cities

            inputs = ScoreInputs(
                resume_skill_tags=resume_version.skill_tags,
                resume_text=resume_version.raw_text or "",
                resume_embedding=resume_version.embedding,
                job_hard_skills=analysis.hard_skills,
                job_soft_skills=analysis.soft_skills,
                job_requirements=[str(r) for r in analysis.requirements],
                job_responsibilities=[str(r) for r in analysis.responsibilities],
                job_keywords=analysis.keywords,
                job_embedding=analysis.embedding,
                job_city=job.city,
                target_cities=target_cities,
            )
            result = MatchScorer().score(inputs)
            suggestions = generate_suggestions(result)
            await ReportService(self.session).create_from_score(task, result, suggestions)

            task.status = MATCH_SUCCEEDED
            task.progress = 100
            task.finished_at = datetime.now(UTC)
            await self.tasks.add(task)
        except AppError:
            task.status = MATCH_FAILED
            task.error_code = ErrorCode.INTERNAL_ERROR
            task.finished_at = datetime.now(UTC)
            await self.tasks.add(task)
            raise
        return task

    async def get_task(self, user_id: uuid.UUID, task_id: uuid.UUID) -> MatchTask:
        task = await self.tasks.get_owned(task_id, user_id)
        if task is None:
            raise AppError(ErrorCode.TASK_NOT_FOUND)
        return task

    async def report_id_for_task(self, task_id: uuid.UUID) -> uuid.UUID | None:
        report = await self.reports.get_by_task(task_id)
        return report.id if report is not None else None
