"""API v1 router aggregation.

Domain module routers are mounted here as they land in later phases (auth,
profiles, resumes, jobs, matches, reports, ...). Keeping a single aggregation
point makes the public surface easy to reason about and to version.
"""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1 import health

api_router = APIRouter()
api_router.include_router(health.router)

# --- Domain routers (mounted incrementally per phase) -----------------------
# from app.modules.auth.router import router as auth_router
# api_router.include_router(auth_router)
