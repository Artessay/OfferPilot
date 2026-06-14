"""Central import point for all ORM models.

Importing this module ensures every model is registered on ``Base.metadata``.
Used by Alembic (autogenerate) and by the test harness (create_all). Keeping
the imports here avoids import cycles between domain modules.
"""

from __future__ import annotations

from app.db.base import Base
from app.modules.admin.models import PromptTemplate, ScoringRule
from app.modules.application.models import ApplicationRecord
from app.modules.audit.models import AuditLog, ModelCallLog
from app.modules.auth.models import User
from app.modules.job.models import Job, JobAnalysis
from app.modules.job_discovery.models import (
    DiscoveredJobCandidate,
    JobDiscoveryTask,
    JobSourceConfig,
)
from app.modules.match.models import MatchTask
from app.modules.profile.models import Profile
from app.modules.recommendation.models import RecommendationItem, RecommendationList
from app.modules.report.models import MatchReport, OptimizationSuggestion
from app.modules.resume.models import Resume, ResumeVersion
from app.modules.resume_rewrite.models import ResumeRewriteTask

__all__ = [
    "ApplicationRecord",
    "AuditLog",
    "Base",
    "DiscoveredJobCandidate",
    "Job",
    "JobAnalysis",
    "JobDiscoveryTask",
    "JobSourceConfig",
    "MatchReport",
    "MatchTask",
    "ModelCallLog",
    "OptimizationSuggestion",
    "Profile",
    "PromptTemplate",
    "RecommendationItem",
    "RecommendationList",
    "Resume",
    "ResumeRewriteTask",
    "ResumeVersion",
    "ScoringRule",
    "User",
]
