"""Shared kernel: cross-cutting infrastructure used by every domain module.

Nothing in here may import from ``app.modules`` — the dependency direction is
always ``modules -> shared`` so that domain modules stay independently
extractable into separate services later.
"""
