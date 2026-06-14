"""Resume rewrite service: draft generation, fact checking, confirm to version."""

from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.rewrite import DiffBlock, build_rewrite_drafts, check_fact_consistency
from app.modules.job.repository import JobAnalysisRepository
from app.modules.report.models import SUGGESTION_ACCEPTED
from app.modules.report.repository import MatchReportRepository, SuggestionRepository
from app.modules.resume.repository import ResumeVersionRepository
from app.modules.resume.service import ResumeService
from app.modules.resume_rewrite.models import (
    REWRITE_CONFIRMED,
    REWRITE_DRAFTED,
    ResumeRewriteTask,
)
from app.modules.resume_rewrite.repository import ResumeRewriteTaskRepository
from app.shared.errors import AppError, ErrorCode, NotFoundError


class ResumeRewriteService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.tasks = ResumeRewriteTaskRepository(session)
        self.resume_versions = ResumeVersionRepository(session)
        self.reports = MatchReportRepository(session)
        self.suggestions = SuggestionRepository(session)
        self.job_analyses = JobAnalysisRepository(session)

    async def create_and_draft(
        self,
        *,
        user_id: uuid.UUID,
        resume_version_id: uuid.UUID,
        report_id: uuid.UUID,
        suggestion_ids: list[uuid.UUID],
    ) -> tuple[ResumeRewriteTask, list[DiffBlock], list[str]]:
        version = await self.resume_versions.get_for_user(resume_version_id, user_id)
        if version is None:
            raise NotFoundError("简历版本不存在。")
        report = await self.reports.get_owned(report_id, user_id)
        if report is None:
            raise NotFoundError("报告不存在。")

        selected_ids = set(suggestion_ids)
        all_suggestions = await self.suggestions.list_for_report(report_id)
        chosen = [s for s in all_suggestions if not selected_ids or s.id in selected_ids]
        if not chosen:
            raise AppError(ErrorCode.RESUME_REWRITE_FAILED, "未选择可用于改写的建议。")

        analysis = await self.job_analyses.get_for_job(report.job_id)
        job_hard_skills = analysis.hard_skills if analysis else []

        diff_blocks, materials = build_rewrite_drafts(
            original_resume_text=version.raw_text or "",
            resume_skill_tags=version.skill_tags,
            accepted_suggestions=[_to_dict(s) for s in chosen],
            job_hard_skills=job_hard_skills,
        )

        task = ResumeRewriteTask(
            user_id=user_id,
            resume_version_id=resume_version_id,
            report_id=report_id,
            suggestion_ids=[str(i) for i in selected_ids],
            status=REWRITE_DRAFTED,
            original_segments=[b.original for b in diff_blocks],
            rewritten_segments=[b.rewritten for b in diff_blocks],
            diff_summary=[_block_dict(b) for b in diff_blocks],
        )
        await self.tasks.add(task)
        return task, diff_blocks, materials

    async def confirm(
        self,
        *,
        user_id: uuid.UUID,
        rewrite_task_id: uuid.UUID,
        edited_content: str,
        version_summary: str | None,
    ) -> ResumeRewriteTask:
        task = await self.tasks.get_owned(rewrite_task_id, user_id)
        if task is None:
            raise AppError(ErrorCode.TASK_NOT_FOUND)
        original = await self.resume_versions.get_for_user(task.resume_version_id, user_id)
        if original is None:
            raise NotFoundError("原简历版本不存在。")

        # Final fact-consistency gate before persisting a new version.
        violations = check_fact_consistency(original.raw_text or "", edited_content)
        if violations:
            raise AppError(
                ErrorCode.RESUME_REWRITE_FAILED,
                "改写内容包含原简历不存在的事实，请改为手动编辑：" + "；".join(violations),
            )

        resume_id = original.resume_id
        new_version = await ResumeService(self.session).create_manual_version(
            user_id=user_id,
            resume_id=resume_id,
            raw_text=edited_content,
            source_report_id=task.report_id,
            summary=version_summary,
        )
        task.status = REWRITE_CONFIRMED
        task.new_resume_version_id = new_version.id
        await self.tasks.add(task)

        # Mark the chosen suggestions as accepted.
        for suggestion_id in task.suggestion_ids:
            suggestion = await self.suggestions.get_owned(uuid.UUID(suggestion_id), user_id)
            if suggestion is not None:
                suggestion.status = SUGGESTION_ACCEPTED
        await self.session.flush()
        return task

    async def get_task(self, user_id: uuid.UUID, task_id: uuid.UUID) -> ResumeRewriteTask:
        task = await self.tasks.get_owned(task_id, user_id)
        if task is None:
            raise AppError(ErrorCode.TASK_NOT_FOUND)
        return task


def _to_dict(suggestion: object) -> dict[str, object]:
    return {
        "category": getattr(suggestion, "category", ""),
        "suggestion": getattr(suggestion, "suggestion", ""),
        "reason": getattr(suggestion, "reason", ""),
        "rewritable": getattr(suggestion, "rewritable", True),
    }


def _block_dict(block: DiffBlock) -> dict[str, str]:
    return {
        "section": block.section,
        "original": block.original,
        "rewritten": block.rewritten,
        "reason": block.reason,
        "riskWarning": block.risk_warning,
    }
