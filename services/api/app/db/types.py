"""Portable column types.

``JSONB`` uses PostgreSQL's binary JSON in production while falling back to the
generic JSON type on other databases (e.g. SQLite used in tests). This keeps
models database-agnostic without losing JSONB performance in production.
"""

from __future__ import annotations

from sqlalchemy import JSON
from sqlalchemy.dialects.postgresql import JSONB as PG_JSONB

# Use JSONB on PostgreSQL, plain JSON elsewhere.
JSONB = JSON().with_variant(PG_JSONB(astext_type=None), "postgresql")
