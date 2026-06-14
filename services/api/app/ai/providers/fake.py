"""Deterministic, offline LLM provider for development, CI and tests.

* ``embed`` returns stable hashed embeddings (meaningful overlap similarity).
* ``complete`` returns no enhancement (empty / ``{}``) so the rule-based
  orchestration output stands. This keeps every flow runnable with zero
  external dependencies while real providers add LLM-quality text on top.
"""

from __future__ import annotations

from app.ai.embedding import deterministic_embedding
from app.ai.providers.base import CompletionResult, LLMProvider


class FakeProvider(LLMProvider):
    name = "fake"

    async def complete(
        self,
        *,
        system: str,
        user: str,
        json_mode: bool = False,
        max_tokens: int = 1024,
        temperature: float = 0.2,
    ) -> CompletionResult:
        content = "{}" if json_mode else ""
        # Rough token estimate for cost-logging parity with real providers.
        prompt_tokens = (len(system) + len(user)) // 4
        return CompletionResult(
            content=content,
            prompt_tokens=prompt_tokens,
            completion_tokens=len(content) // 4,
            model="fake",
        )

    async def embed(self, texts: list[str]) -> list[list[float]]:
        return [deterministic_embedding(t) for t in texts]
