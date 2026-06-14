"""Provider factory: returns the configured provider as a cached singleton."""

from __future__ import annotations

from functools import lru_cache

from app.ai.providers.base import LLMProvider
from app.shared.config import get_settings


@lru_cache
def get_provider() -> LLMProvider:
    """Return the configured LLM provider (cached for the process)."""
    settings = get_settings()
    if settings.ai_provider == "openai_compatible":
        from app.ai.providers.openai_compatible import OpenAICompatibleProvider

        return OpenAICompatibleProvider()
    from app.ai.providers.fake import FakeProvider

    return FakeProvider()
