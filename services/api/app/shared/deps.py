"""Reusable FastAPI dependencies: DB session, current user, role guards."""

from __future__ import annotations

import uuid
from collections.abc import Awaitable, Callable
from typing import Annotated

import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.modules.auth.models import ROLE_ADMIN, User
from app.modules.auth.service import AuthService
from app.shared.errors import AuthRequiredError, PermissionDeniedError
from app.shared.security import decode_token

# auto_error=False so we can return our standard error envelope instead of
# FastAPI's default 403 body.
_bearer = HTTPBearer(auto_error=False)

SessionDep = Annotated[AsyncSession, Depends(get_session)]
_CredentialsDep = Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)]


async def get_current_user(session: SessionDep, credentials: _CredentialsDep) -> User:
    """Resolve and return the authenticated user, or raise AUTH_REQUIRED."""
    if credentials is None:
        raise AuthRequiredError()
    try:
        payload = decode_token(credentials.credentials, expected_type="access")
        user_id = uuid.UUID(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError) as exc:
        raise AuthRequiredError() from exc
    return await AuthService(session).get_user(user_id)


async def get_optional_user(session: SessionDep, credentials: _CredentialsDep) -> User | None:
    """Return the authenticated user if a valid token is present, else None."""
    if credentials is None:
        return None
    try:
        return await get_current_user(session, credentials)
    except AuthRequiredError:
        return None


CurrentUser = Annotated[User, Depends(get_current_user)]
OptionalUser = Annotated[User | None, Depends(get_optional_user)]


def require_role(*roles: str) -> Callable[[User], Awaitable[User]]:
    """Build a dependency that enforces the user has one of ``roles``."""

    async def _guard(user: CurrentUser) -> User:
        if user.role not in roles:
            raise PermissionDeniedError()
        return user

    return _guard


require_admin = require_role(ROLE_ADMIN)
AdminUser = Annotated[User, Depends(require_admin)]
