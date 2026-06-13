"""Tests for liveness/readiness probes and the response/error envelopes."""

from __future__ import annotations

from httpx import AsyncClient


async def test_health_returns_envelope(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/health")

    assert resp.status_code == 200
    body = resp.json()
    assert body["data"]["status"] == "ok"
    assert body["data"]["environment"] == "test"
    assert body["requestId"].startswith("req_")
    assert "timestamp" in body
    # request id is echoed back as a header
    assert resp.headers["X-Request-ID"] == body["requestId"]


async def test_ready_probe(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/ready")

    assert resp.status_code == 200
    assert resp.json()["data"]["ready"] is True


async def test_incoming_request_id_is_preserved(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/health", headers={"X-Request-ID": "req_custom123"})

    assert resp.headers["X-Request-ID"] == "req_custom123"
    assert resp.json()["requestId"] == "req_custom123"


async def test_unknown_route_uses_error_envelope(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/does-not-exist")

    assert resp.status_code == 404
    error = resp.json()["error"]
    assert error["code"] == "NOT_FOUND"
    assert error["requestId"].startswith("req_")
