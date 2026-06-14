"""Recommendation service: build tiered job recommendation combos (§5.4)."""

from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.recommendation import (
    JobContext,
    classify_tier,
    opportunity_value,
    predict_success_probability,
    risk_level,
)
from app.ai.scoring.engine import MatchScorer, ScoreInputs
from app.modules.job.repository import JobAnalysisRepository
from app.modules.job_discovery.repository import (
    DiscoveredCandidateRepository,
    JobDiscoveryTaskRepository,
)
from app.modules.profile.repository import ProfileRepository
from app.modules.recommendation.models import RecommendationItem, RecommendationList
from app.modules.recommendation.repository import (
    RecommendationItemRepository,
    RecommendationListRepository,
)
from app.modules.recommendation.schemas import (
    RecommendationOut,
    TierGroupOut,
    TierItemOut,
)
from app.modules.resume.repository import ResumeVersionRepository
from app.shared.errors import AppError, ErrorCode, NotFoundError

# Display order + Chinese names for tiers.
TIER_DISPLAY: list[tuple[str, str]] = [
    ("priority", "重点匹配层"),
    ("exploratory", "拓展机会层"),
    ("baseline", "基础保障层"),
]


class RecommendationService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.lists = RecommendationListRepository(session)
        self.items = RecommendationItemRepository(session)
        self.tasks = JobDiscoveryTaskRepository(session)
        self.candidates = DiscoveredCandidateRepository(session)
        self.job_analyses = JobAnalysisRepository(session)
        self.profiles = ProfileRepository(session)
        self.resume_versions = ResumeVersionRepository(session)

    async def create_tiered(
        self,
        *,
        user_id: uuid.UUID,
        discovery_task_id: uuid.UUID,
        resume_version_id: uuid.UUID | None,
        strategy: str,
    ) -> RecommendationList:
        task = await self.tasks.get_owned(discovery_task_id, user_id)
        if task is None:
            raise AppError(ErrorCode.TASK_NOT_FOUND)
        version_id = resume_version_id or task.resume_version_id
        if version_id is None:
            raise AppError(ErrorCode.RECOMMENDATION_FAILED, "缺少用于评分的简历版本。")
        resume_version = await self.resume_versions.get_for_user(version_id, user_id)
        if resume_version is None:
            raise NotFoundError("简历版本不存在。")

        profile = await self.profiles.get_by_user(user_id)
        rows = await self.candidates.list_with_jobs(discovery_task_id)
        if not rows:
            raise AppError(ErrorCode.RECOMMENDATION_FAILED, "没有可用于推荐的候选岗位。")

        rec_list = RecommendationList(
            user_id=user_id,
            discovery_task_id=discovery_task_id,
            resume_version_id=version_id,
            strategy=strategy,
        )
        await self.lists.add(rec_list)

        scorer = MatchScorer()
        for _candidate, job in rows:
            analysis = await self.job_analyses.get_for_job(job.id)
            if analysis is None:
                continue
            result = scorer.score(
                ScoreInputs(
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
                    target_cities=profile.target_cities if profile else [],
                )
            )
            success = predict_success_probability(result)
            risk = risk_level(result)
            opportunity = opportunity_value(
                JobContext(
                    target_roles=profile.target_roles if profile else [],
                    target_cities=profile.target_cities if profile else [],
                    industries=profile.industries if profile else [],
                    job_title=job.title,
                    job_company=job.company,
                    job_city=job.city,
                )
            )
            tier = classify_tier(
                result=result,
                opportunity=opportunity,
                success_probability=success,
                risk=risk,
                strategy=strategy,
            )
            self.session.add(
                RecommendationItem(
                    recommendation_list_id=rec_list.id,
                    job_id=job.id,
                    tier=tier.tier,
                    match_score=tier.match_score,
                    success_probability=tier.success_probability,
                    opportunity_value=tier.opportunity_value,
                    risk_level=tier.risk_level,
                    tier_reason=tier.tier_reason,
                    suggested_action=tier.suggested_action,
                )
            )
        rec_list.summary = await self._summary(rec_list.id)
        await self.lists.add(rec_list)
        await self.session.flush()
        return rec_list

    async def get_recommendation(
        self, user_id: uuid.UUID, recommendation_id: uuid.UUID
    ) -> RecommendationOut:
        rec_list = await self.lists.get_owned(recommendation_id, user_id)
        if rec_list is None:
            raise NotFoundError("推荐组合不存在。")
        rows = await self.items.list_with_jobs(recommendation_id)
        # Group items by tier preserving the display order.
        tiers: list[TierGroupOut] = []
        for tier_code, tier_name in TIER_DISPLAY:
            tier_items = [
                TierItemOut(
                    job_id=item.job_id,
                    title=job.title,
                    company=job.company,
                    match_score=item.match_score,
                    success_probability=float(item.success_probability or 0.0),
                    opportunity_value=item.opportunity_value,
                    risk_level=item.risk_level,
                    tier_reason=item.tier_reason or "",
                    suggested_action=item.suggested_action or "",
                )
                for item, job in rows
                if item.tier == tier_code
            ]
            tiers.append(TierGroupOut(tier=tier_code, name=tier_name, items=tier_items))
        return RecommendationOut(
            recommendation_id=rec_list.id,
            strategy=rec_list.strategy,
            summary=rec_list.summary,
            tiers=tiers,
        )

    async def _summary(self, recommendation_list_id: uuid.UUID) -> str:
        items = await self.items.list_for_list(recommendation_list_id)
        if not items:
            return "未生成推荐岗位。"
        avg = round(sum(i.match_score for i in items) / len(items))
        counts = {code: 0 for code, _ in TIER_DISPLAY}
        for item in items:
            counts[item.tier] = counts.get(item.tier, 0) + 1
        return (
            f"共 {len(items)} 个候选岗位，平均匹配度 {avg} 分；"
            f"重点匹配 {counts['priority']} 个、拓展机会 {counts['exploratory']} 个、"
            f"基础保障 {counts['baseline']} 个。"
        )
