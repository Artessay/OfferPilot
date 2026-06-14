"""Arq task functions.

Each task opens its own DB session and delegates to the relevant domain
service, so the exact same logic runs whether invoked inline (request path) or
offloaded to the worker. Tasks are registered in ``app.workers.main``.
"""

from __future__ import annotations

import uuid
from typing import Any

from app.db.session import get_sessionmaker
from app.shared.logging import get_logger

logger = get_logger(__name__)


async def parse_resume_task(ctx: dict[str, Any], resume_id: str) -> str:
    """Re-parse a resume's stored file and create a new version."""
    from app.modules.resume.service import ResumeService

    factory = get_sessionmaker()
    async with factory() as session:
        try:
            version = await ResumeService(session).run_parse(uuid.UUID(resume_id))
            await session.commit()
        except Exception:
            await session.rollback()
            raise
    logger.info("parse_resume_task_done", resume_id=resume_id, version=version.version_no)
    return str(version.id)


async def parse_job_task(ctx: dict[str, Any], job_id: str) -> str:
    """(Re)analyse a job's JD text."""
    from app.modules.job.service import JobService

    factory = get_sessionmaker()
    async with factory() as session:
        try:
            analysis = await JobService(session).run_parse(uuid.UUID(job_id))
            await session.commit()
        except Exception:
            await session.rollback()
            raise
    logger.info("parse_job_task_done", job_id=job_id)
    return str(analysis.id)
