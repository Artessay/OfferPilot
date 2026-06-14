"""OpenAI-compatible provider (OpenAI, DeepSeek, Qwen, Zhipu, Azure-compatible).

Talks to any endpoint exposing the OpenAI ``/chat/completions`` and
``/embeddings`` REST shape. Configure via ``AI_API_BASE`` / ``AI_API_KEY`` /
``AI_CHAT_MODEL`` / ``AI_EMBEDDING_MODEL``.
"""

from __future__ import annotations

from typing import Any, cast

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.ai.providers.base import CompletionResult, LLMProvider
from app.shared.config import get_settings
from app.shared.errors import AppError, ErrorCode
from app.shared.logging import get_logger

logger = get_logger(__name__)

_RETRYABLE = (httpx.TransportError, httpx.HTTPStatusError)


class OpenAICompatibleProvider(LLMProvider):
    name = "openai_compatible"

    def __init__(self) -> None:
        settings = get_settings()
        if not settings.ai_api_base:
            raise AppError(
                ErrorCode.LLM_PROVIDER_FAILED,
                "未配置 AI_API_BASE，无法使用真实模型提供方。",
            )
        self._base = settings.ai_api_base.rstrip("/")
        self._key = settings.ai_api_key or ""
        self._chat_model = settings.ai_chat_model
        self._embed_model = settings.ai_embedding_model
        self._timeout = settings.ai_request_timeout_seconds

    def _headers(self) -> dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self._key:
            headers["Authorization"] = f"Bearer {self._key}"
        return headers

    @retry(
        retry=retry_if_exception_type(_RETRYABLE),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=0.5, max=4),
        reraise=True,
    )
    async def _post(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            resp = await client.post(f"{self._base}{path}", json=payload, headers=self._headers())
            resp.raise_for_status()
            return cast("dict[str, Any]", resp.json())

    async def complete(
        self,
        *,
        system: str,
        user: str,
        json_mode: bool = False,
        max_tokens: int = 1024,
        temperature: float = 0.2,
    ) -> CompletionResult:
        payload: dict[str, Any] = {
            "model": self._chat_model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}
        try:
            data = await self._post("/chat/completions", payload)
        except Exception as exc:
            logger.warning("llm_complete_failed", error=str(exc))
            raise AppError(ErrorCode.LLM_PROVIDER_FAILED) from exc

        choice = data["choices"][0]["message"]["content"]
        usage = data.get("usage", {})
        return CompletionResult(
            content=choice or "",
            prompt_tokens=int(usage.get("prompt_tokens", 0)),
            completion_tokens=int(usage.get("completion_tokens", 0)),
            model=self._chat_model,
        )

    async def embed(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        try:
            data = await self._post("/embeddings", {"model": self._embed_model, "input": texts})
        except Exception as exc:
            logger.warning("llm_embed_failed", error=str(exc))
            raise AppError(ErrorCode.LLM_PROVIDER_FAILED) from exc
        return [item["embedding"] for item in data["data"]]
