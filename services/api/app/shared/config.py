"""Application configuration loaded from environment variables / .env file."""

from __future__ import annotations

import json
from functools import lru_cache
from typing import Annotated, Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

Environment = Literal["local", "test", "staging", "production"]


class Settings(BaseSettings):
    """Strongly-typed application settings.

    Values are read (in priority order) from real environment variables and
    then from a local ``.env`` file. Unknown keys are ignored so the same file
    can be shared with docker-compose.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # --- Application ---
    app_name: str = "OfferPilot API"
    environment: Environment = "local"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"

    # --- HTTP server ---
    host: str = "0.0.0.0"  # bound inside containers/compose
    port: int = 8000

    # --- CORS (comma separated or JSON list) ---
    # NoDecode lets the validator below handle both formats; without it
    # pydantic-settings would JSON-decode the env value and reject "a,b".
    cors_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:5173"]
    )

    # --- Datastores ---
    database_url: str = "postgresql+asyncpg://offerpilot:offerpilot@localhost:5432/offerpilot"
    redis_url: str = "redis://localhost:6379/0"

    # --- Security / auth ---
    jwt_secret: str = "change-me-in-production"  # dev default; override in prod
    jwt_algorithm: str = "HS256"
    access_token_ttl_minutes: int = 60
    refresh_token_ttl_days: int = 14

    # --- AI orchestration ---
    # "fake" is a deterministic, offline provider used for dev/CI/tests.
    ai_provider: Literal["fake", "openai_compatible"] = "fake"
    ai_api_base: str | None = None
    ai_api_key: str | None = None
    ai_chat_model: str = "gpt-4o-mini"
    ai_embedding_model: str = "text-embedding-3-small"
    ai_request_timeout_seconds: float = 60.0

    # --- Storage ---
    storage_backend: Literal["local", "s3"] = "local"
    storage_local_dir: str = "./storage_data"

    # --- Observability ---
    log_level: str = "INFO"
    log_json: bool = True

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_cors(cls, value: object) -> object:
        """Accept either ``CORS_ORIGINS=a,b,c`` or a JSON array string."""
        if isinstance(value, str):
            text = value.strip()
            if text.startswith("["):
                return json.loads(text)
            return [item.strip() for item in text.split(",") if item.strip()]
        return value

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    """Return a cached singleton ``Settings`` instance."""
    return Settings()
