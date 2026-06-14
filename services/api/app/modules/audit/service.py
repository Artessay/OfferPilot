"""Audit logging service: records minimised, de-identified sensitive actions."""

from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.audit.models import AuditLog
from app.shared.context import get_request_id


class AuditService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def log(
        self,
        *,
        action: str,
        user_id: uuid.UUID | None = None,
        resource_type: str | None = None,
        resource_id: str | None = None,
        detail: dict[str, object] | None = None,
    ) -> None:
        """Append an audit entry. Never store raw resume/JD text or PII here."""
        self.session.add(
            AuditLog(
                user_id=user_id,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                request_id=get_request_id(),
                detail=detail or {},
            )
        )
        await self.session.flush()
