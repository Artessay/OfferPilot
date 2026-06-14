"""Auth HTTP routes."""

from __future__ import annotations

from fastapi import APIRouter, status

from app.modules.auth.schemas import (
    AuthResult,
    GuestRequest,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenPair,
    UserPublic,
)
from app.modules.auth.service import AuthService
from app.shared.deps import CurrentUser, SessionDep
from app.shared.responses import Envelope, envelope
router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=Envelope[AuthResult],
    status_code=status.HTTP_201_CREATED,
    summary="注册用户",
)
async def register(payload: RegisterRequest, session: SessionDep) -> Envelope[AuthResult]:
    return envelope(await AuthService(session).register(payload))


@router.post("/login", response_model=Envelope[AuthResult], summary="用户登录")
async def login(payload: LoginRequest, session: SessionDep) -> Envelope[AuthResult]:
    return envelope(await AuthService(session).login(payload))


@router.post("/guest", response_model=Envelope[AuthResult], summary="创建匿名试用会话")
async def guest(payload: GuestRequest, session: SessionDep) -> Envelope[AuthResult]:
    return envelope(await AuthService(session).create_guest(payload))


@router.post("/refresh", response_model=Envelope[TokenPair], summary="刷新访问令牌")
async def refresh(payload: RefreshRequest, session: SessionDep) -> Envelope[TokenPair]:
    return envelope(await AuthService(session).refresh(payload.refresh_token))


# A separate users router for the current-user resource.
users_router = APIRouter(prefix="/users", tags=["users"])


@users_router.get("/me", response_model=Envelope[UserPublic], summary="获取当前用户")
async def me(user: CurrentUser) -> Envelope[UserPublic]:
    return envelope(UserPublic.model_validate(user))


@users_router.delete(
    "/me",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="注销当前用户并删除数据",
)
async def delete_me(user: CurrentUser, session: SessionDep) -> None:
    await AuthService(session).delete_account(user.id)
