"""Embedding helpers: tokenisation, deterministic embeddings, cosine similarity.

The deterministic embedding is a hashed bag-of-tokens projection. It is *not* a
learned semantic model, but it gives stable, meaningful overlap-based similarity
(texts sharing tokens are closer) which is perfect for offline development and
tests. In production the same interface is served by a real embedding model via
the configured provider.
"""

from __future__ import annotations

import hashlib
import itertools
import math
import re

from app.ai.providers.base import EMBEDDING_DIM

_ASCII_WORD = re.compile(r"[a-z0-9][a-z0-9+#.]*", re.IGNORECASE)
_CJK = re.compile(r"[\u4e00-\u9fff]")


def tokenize(text: str) -> list[str]:
    """Tokenise mixed Chinese/English text.

    Produces lowercase ASCII words plus single CJK characters and CJK bigrams,
    so Chinese phrases overlap meaningfully without a segmentation dependency.
    """
    if not text:
        return []
    lowered = text.lower()
    tokens: list[str] = [m.group(0) for m in _ASCII_WORD.finditer(lowered)]
    cjk_chars = _CJK.findall(text)
    tokens.extend(cjk_chars)
    tokens.extend(a + b for a, b in itertools.pairwise(cjk_chars))
    return tokens


def _bucket(token: str) -> tuple[int, float]:
    digest = hashlib.blake2b(token.encode("utf-8"), digest_size=8).digest()
    value = int.from_bytes(digest, "big")
    index = value % EMBEDDING_DIM
    sign = 1.0 if (value >> 8) & 1 else -1.0
    return index, sign


def deterministic_embedding(text: str, dim: int = EMBEDDING_DIM) -> list[float]:
    """Return a stable, L2-normalised embedding for ``text``."""
    vec = [0.0] * dim
    for token in tokenize(text):
        index, sign = _bucket(token)
        vec[index % dim] += sign
    norm = math.sqrt(sum(v * v for v in vec))
    if norm == 0.0:
        return vec
    return [v / norm for v in vec]


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Cosine similarity of two equal-length vectors, clamped to [0, 1]."""
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b, strict=False))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0.0 or nb == 0.0:
        return 0.0
    raw = dot / (na * nb)
    return max(0.0, min(1.0, raw))
