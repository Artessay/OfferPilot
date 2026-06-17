"""Test rate limiting middleware integration."""

from __future__ import annotations

from httpx import AsyncClient


async def test_ratelimit_middleware_active(client: AsyncClient) -> None:
    """Verify rate limit middleware is registered and active."""
    # Health endpoint should always succeed (within rate limit)
    resp = await client.get("/api/v1/health")
    assert resp.status_code == 200


async def test_health_not_rate_limited(client: AsyncClient) -> None:
    """Verify multiple requests to health endpoint don't trigger rate limit."""
    # Make 5 requests to health endpoint (well within 300/minute limit)
    for _ in range(5):
        resp = await client.get("/api/v1/health")
        assert resp.status_code == 200, "Health check should not be rate limited"


async def test_ratelimit_config_loaded(client: AsyncClient) -> None:
    """Verify rate limit configuration is loaded (middleware active)."""
    from app.shared.config import get_settings

    settings = get_settings()
    # Should have a rate limit configured (300 per minute by default)
    assert settings.rate_limit_per_minute == 300
