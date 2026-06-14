"""Application-tracking HTTP routes."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Query, status

from app.modules.application.schemas import (
    ApplicationCreate,
    ApplicationOut,
    ApplicationUpdate,
)
from app.modules.application.service import ApplicationService
from app.shared.deps import CurrentUser, SessionDep
from app.shared.responses import Envelope, Page, envelope, paginate

router = APIRouter(prefix="/applications", tags=["applications"])


@router.post(
    "",
    response_model=Envelope[ApplicationOut],
    status_code=status.HTTP_201_CREATED,
    summary="加入投递跟踪",
)
async def create_application(
    payload: ApplicationCreate, user: CurrentUser, session: SessionDep
) -> Envelope[ApplicationOut]:
    record = await ApplicationService(session).create(user.id, payload)
    return envelope(record)


@router.get("", response_model=Envelope[Page[ApplicationOut]], summary="查询投递记录")
async def list_applications(
    user: CurrentUser,
    session: SessionDep,
    status_filter: str | None = Query(default=None, alias="status"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100, alias="pageSize"),
) -> Envelope[Page[ApplicationOut]]:
    items, total = await ApplicationService(session).list_records(
        user.id, status=status_filter, offset=(page - 1) * page_size, limit=page_size
    )
    return envelope(paginate(items, page=page, page_size=page_size, total=total))


@router.get(
    "/{record_id}",
    response_model=Envelope[ApplicationOut],
    summary="查询投递记录详情",
)
async def get_application(
    record_id: uuid.UUID, user: CurrentUser, session: SessionDep
) -> Envelope[ApplicationOut]:
    record = await ApplicationService(session).get(user.id, record_id)
    return envelope(record)


@router.patch(
    "/{record_id}",
    response_model=Envelope[ApplicationOut],
    summary="更新投递状态/备注",
)
async def update_application(
    record_id: uuid.UUID,
    payload: ApplicationUpdate,
    user: CurrentUser,
    session: SessionDep,
) -> Envelope[ApplicationOut]:
    record = await ApplicationService(session).update(user.id, record_id, payload)
    return envelope(record)


@router.delete(
    "/{record_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除投递记录",
)
async def delete_application(record_id: uuid.UUID, user: CurrentUser, session: SessionDep) -> None:
    await ApplicationService(session).delete(user.id, record_id)
