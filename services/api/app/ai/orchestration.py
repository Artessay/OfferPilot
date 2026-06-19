"""High-level AI orchestration.

Ties the deterministic rule-based extractors together with the configured
provider (for embeddings, and optionally LLM refinement). Service-layer code
depends on this facade rather than on providers or extractors directly.
"""

from __future__ import annotations

from typing import Any

from app.ai.extraction import parse_jd, parse_resume
from app.ai.providers import LLMProvider, get_provider

# Prompt/model versioning surfaced on persisted analyses for traceability.
RESUME_PARSE_VERSION = "resume_parse_v1"
JOB_PARSE_VERSION = "job_parse_v1"


class AIOrchestrator:
    """Facade over extraction + embedding + (optional) LLM refinement."""

    def __init__(self, provider: LLMProvider | None = None) -> None:
        self.provider = provider or get_provider()

    async def embed(self, texts: list[str]) -> list[list[float]]:
        return await self.provider.embed(texts)

    async def parse_resume(self, text: str) -> dict[str, Any]:
        """Return structured resume data plus an embedding of its key content."""
        result = parse_resume(text)
        [embedding] = await self.provider.embed([self._resume_embedding_source(result)])
        result["embedding"] = embedding
        result["model_version"] = self.provider.name
        result["prompt_version"] = RESUME_PARSE_VERSION
        return result

    async def parse_job(self, *, title: str, company: str | None, text: str) -> dict[str, Any]:
        """Return structured JD data plus an embedding of its requirements."""
        result = parse_jd(text)
        source = self._job_embedding_source(title, company, result)
        [embedding] = await self.provider.embed([source])
        result["embedding"] = embedding
        result["model_version"] = self.provider.name
        result["prompt_version"] = JOB_PARSE_VERSION
        return result

    async def embed_resume_fields(
        self,
        *,
        structured_data: dict[str, Any],
        skill_tags: list[str],
        summary: str | None,
    ) -> list[float]:
        """Recompute a resume version embedding after its fields were edited."""
        source = self._resume_embedding_source(
            {
                "structured_data": structured_data,
                "skill_tags": skill_tags,
                "summary": summary or "",
            }
        )
        [embedding] = await self.provider.embed([source])
        return embedding

    @staticmethod
    def _resume_embedding_source(parsed: dict[str, Any]) -> str:
        sd = parsed["structured_data"]
        parts = [
            " ".join(parsed["skill_tags"]),
            " ".join(sd.get("experiences", [])),
            " ".join(sd.get("projects", [])),
        ]
        return "\n".join(p for p in parts if p) or parsed.get("summary", "")

    @staticmethod
    def _job_embedding_source(title: str, company: str | None, parsed: dict[str, Any]) -> str:
        parts = [
            title,
            company or "",
            " ".join(parsed["hard_skills"]),
            " ".join(parsed["requirements"]),
            " ".join(parsed["responsibilities"]),
        ]
        return "\n".join(p for p in parts if p)
