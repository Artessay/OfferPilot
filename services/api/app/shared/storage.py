"""File storage abstraction with a local-filesystem backend.

The protocol keeps resume/JD file handling independent of where bytes live, so
an S3-compatible backend can be added without touching callers. Object keys are
opaque, sanitised paths to avoid traversal.
"""

from __future__ import annotations

import re
import uuid
from functools import lru_cache
from pathlib import Path
from typing import Protocol

from app.shared.config import get_settings

_SAFE_SEGMENT = re.compile(r"[^a-zA-Z0-9_.-]")


def build_object_key(*, prefix: str, filename: str) -> str:
    """Build a sanitised, collision-resistant storage key."""
    safe_name = _SAFE_SEGMENT.sub("_", filename).strip("._") or "file"
    return f"{prefix.strip('/')}/{uuid.uuid4().hex}_{safe_name}"


class StorageBackend(Protocol):
    async def save(self, key: str, data: bytes, *, content_type: str | None = None) -> str: ...
    async def get(self, key: str) -> bytes: ...
    async def delete(self, key: str) -> None: ...
    async def exists(self, key: str) -> bool: ...


class LocalStorage:
    """Stores objects under a base directory on the local filesystem."""

    def __init__(self, base_dir: str) -> None:
        self._base = Path(base_dir).resolve()
        self._base.mkdir(parents=True, exist_ok=True)

    def _path(self, key: str) -> Path:
        # Resolve and ensure the final path stays within the base directory.
        target = (self._base / key).resolve()
        if not target.is_relative_to(self._base):
            raise ValueError("invalid storage key")
        return target

    async def save(self, key: str, data: bytes, *, content_type: str | None = None) -> str:
        path = self._path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return key

    async def get(self, key: str) -> bytes:
        return self._path(key).read_bytes()

    async def delete(self, key: str) -> None:
        path = self._path(key)
        if path.exists():
            path.unlink()

    async def exists(self, key: str) -> bool:
        return self._path(key).exists()


@lru_cache
def get_storage() -> StorageBackend:
    """Return the configured storage backend (cached)."""
    settings = get_settings()
    # S3 backend can be selected here when storage_backend == "s3".
    return LocalStorage(settings.storage_local_dir)
