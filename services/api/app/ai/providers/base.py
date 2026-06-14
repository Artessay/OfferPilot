"""Provider abstraction and shared types."""

from __future__ import annotations

import abc
from dataclasses import dataclass

EMBEDDING_DIM = 256


@dataclass(slots=True)
class CompletionResult:
    """Result of a single chat/completion call."""

    content: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    model: str = ""


class LLMProvider(abc.ABC):
    """Abstract base for chat-completion + embedding providers.

    Implementations must be safe to call concurrently. They should raise
    :class:`app.shared.errors.AppError` with ``ErrorCode.LLM_PROVIDER_FAILED``
    on unrecoverable provider errors so callers can apply degraded paths.
    """

    name: str = "base"

    @abc.abstractmethod
    async def complete(
        self,
        *,
        system: str,
        user: str,
        json_mode: bool = False,
        max_tokens: int = 1024,
        temperature: float = 0.2,
    ) -> CompletionResult:
        """Return a completion for the given system + user prompt."""
        raise NotImplementedError

    @abc.abstractmethod
    async def embed(self, texts: list[str]) -> list[list[float]]:
        """Return one embedding vector per input text."""
        raise NotImplementedError
