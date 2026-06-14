"""API v1 router aggregation.

Domain module routers are mounted here as they land in later phases (auth,
profiles, resumes, jobs, matches, reports, ...). Keeping a single aggregation
point makes the public surface easy to reason about and to version.
"""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1 import health
from app.modules.admin.router import router as admin_router
from app.modules.application.router import router as application_router
from app.modules.auth.router import router as auth_router
from app.modules.auth.router import users_router
from app.modules.job.router import router as job_router
from app.modules.job_discovery.router import router as discovery_router
from app.modules.job_discovery.router import sources_router
from app.modules.match.router import router as match_router
from app.modules.profile.router import router as profile_router
from app.modules.recommendation.router import router as recommendation_router
from app.modules.report.router import router as report_router
from app.modules.report.router import suggestions_router
from app.modules.resume.router import router as resume_router
from app.modules.resume_rewrite.router import router as rewrite_router

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(profile_router)
api_router.include_router(resume_router)
api_router.include_router(job_router)
api_router.include_router(match_router)
api_router.include_router(report_router)
api_router.include_router(suggestions_router)
api_router.include_router(discovery_router)
api_router.include_router(sources_router)
api_router.include_router(recommendation_router)
api_router.include_router(rewrite_router)
api_router.include_router(application_router)
api_router.include_router(admin_router)
