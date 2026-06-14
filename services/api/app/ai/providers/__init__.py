"""LLM / embedding provider adapters.

The :class:`LLMProvider` abstraction decouples the application from any single
model vendor. ``get_provider()`` returns the configured implementation; the
default ``fake`` provider is fully deterministic and offline so the whole
system runs and is testable with no external API keys.
"""

from __future__ import annotations

from app.ai.providers.base import CompletionResult, LLMProvider
from app.ai.providers.factory import get_provider

__all__ = ["CompletionResult", "LLMProvider", "get_provider"]
