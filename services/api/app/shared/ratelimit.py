"""Simple in-memory sliding-window rate limiter.

Suitable for a single API instance / MVP. For multi-instance deployments swap
the in-memory store for a shared Redis-backed counter (the interface stays the
same). Keyed by authenticated user when possible, else client IP.
"""

from __future__ import annotations

import time
from collections import defaultdict, deque

from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

from app.shared.config import get_settings
from app.shared.context import get_request_id
from app.shared.errors import ErrorCode

WINDOW_SECONDS = 60


class SlidingWindowLimiter:
    """Allow at most ``max_requests`` per ``window`` seconds per key."""

    def __init__(self, max_requests: int, window: int = WINDOW_SECONDS) -> None:
        self.max_requests = max_requests
        self.window = window
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def allow(self, key: str, *, now: float | None = None) -> bool:
        current = now if now is not None else time.monotonic()
        bucket = self._hits[key]
        cutoff = current - self.window
        while bucket and bucket[0] < cutoff:
            bucket.popleft()
        if len(bucket) >= self.max_requests:
            return False
        bucket.append(current)
        return True


class RateLimitMiddleware:
    """ASGI middleware enforcing a per-client request rate."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app
        settings = get_settings()
        self.enabled = settings.environment != "test"
        self.limiter = SlidingWindowLimiter(settings.rate_limit_per_minute)

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or not self.enabled:
            await self.app(scope, receive, send)
            return
        request = Request(scope)
        key = self._client_key(request)
        if not self.limiter.allow(key):
            response = JSONResponse(
                status_code=429,
                content={
                    "error": {
                        "code": ErrorCode.RATE_LIMITED.value,
                        "message": "操作过于频繁，请稍后再试。",
                        "requestId": get_request_id(),
                        "details": {},
                    }
                },
            )
            await response(scope, receive, send)
            return
        await self.app(scope, receive, send)

    @staticmethod
    def _client_key(request: Request) -> str:
        auth = request.headers.get("authorization", "")
        if auth:
            return f"token:{hash(auth)}"
        client = request.client
        return f"ip:{client.host}" if client else "ip:unknown"
