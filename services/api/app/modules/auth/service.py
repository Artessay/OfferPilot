"""Authentication service: registration, login, guest sessions, token issuing."""

from __future__ import annotations

import uuid

import jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import ACCOUNT_GUEST, ACCOUNT_REGISTERED, ROLE_STUDENT, User
from app.modules.auth.repository import UserRepository
from app.modules.auth.schemas import (
    AuthResult,
    GuestRequest,
    LoginRequest,
    RegisterRequest,
    TokenPair,
    UserPublic,
)
from app.shared.errors import AppError, AuthRequiredError, ErrorCode
from app.shared.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)


class AuthService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.users = UserRepository(session)

    def _issue_tokens(self, user: User) -> TokenPair:
        claims = {"role": user.role, "accountType": user.account_type}
        return TokenPair(
            access_token=create_access_token(str(user.id), **claims),
            refresh_token=create_refresh_token(str(user.id)),
        )

    def _result(self, user: User) -> AuthResult:
        return AuthResult(user=UserPublic.model_validate(user), tokens=self._issue_tokens(user))

    async def register(self, payload: RegisterRequest) -> AuthResult:
        existing = await self.users.get_by_email(payload.email)
        if existing is not None:
            raise AppError(ErrorCode.CONFLICT, "该邮箱已注册，请直接登录。")
        user = User(
            email=payload.email,
            password_hash=hash_password(payload.password),
            nickname=payload.nickname,
            role=ROLE_STUDENT,
            account_type=ACCOUNT_REGISTERED,
        )
        await self.users.add(user)
        return self._result(user)

    async def login(self, payload: LoginRequest) -> AuthResult:
        user = await self.users.get_by_email(payload.email)
        if user is None or user.password_hash is None:
            raise AppError(ErrorCode.AUTH_REQUIRED, "邮箱或密码不正确。")
        if not verify_password(payload.password, user.password_hash):
            raise AppError(ErrorCode.AUTH_REQUIRED, "邮箱或密码不正确。")
        return self._result(user)

    async def create_guest(self, payload: GuestRequest) -> AuthResult:
        nickname = f"访客{payload.device_id[:6]}" if payload.device_id else "访客用户"
        user = User(
            email=None,
            password_hash=None,
            nickname=nickname,
            role=ROLE_STUDENT,
            account_type=ACCOUNT_GUEST,
        )
        await self.users.add(user)
        return self._result(user)

    async def refresh(self, refresh_token: str) -> TokenPair:
        try:
            payload = decode_token(refresh_token, expected_type="refresh")
        except jwt.InvalidTokenError as exc:
            raise AuthRequiredError("登录已过期，请重新登录。") from exc
        user = await self.users.get(uuid.UUID(payload["sub"]))
        if user is None or user.deleted_at is not None:
            raise AuthRequiredError("登录已过期，请重新登录。")
        return self._issue_tokens(user)

    async def get_user(self, user_id: uuid.UUID) -> User:
        user = await self.users.get(user_id)
        if user is None or user.deleted_at is not None:
            raise AuthRequiredError()
        return user

    async def delete_account(self, user_id: uuid.UUID) -> None:
        """Permanently delete a user and all owned data (privacy / AC06).

        Resume files are removed from storage first, then the user row is
        deleted, cascading to all child records via ON DELETE CASCADE.
        """
        from app.modules.audit.service import AuditService
        from app.modules.resume.repository import ResumeRepository
        from app.shared.storage import get_storage

        user = await self.users.get(user_id)
        if user is None:
            return
        storage = get_storage()
        resumes = await ResumeRepository(self.session).list_for_user(user_id, offset=0, limit=1000)
        for resume in resumes:
            if resume.file_key:
                await storage.delete(resume.file_key)
        await AuditService(self.session).log(
            action="account.delete", user_id=user_id, resource_type="user"
        )
        await self.session.delete(user)
        await self.session.flush()
