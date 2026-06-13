# syntax=docker/dockerfile:1
# ---------------------------------------------------------------------------
# OfferPilot API — production image (used for deployment on the target host).
# Multi-stage build keeps the runtime image small and runs as a non-root user.
# ---------------------------------------------------------------------------
FROM python:3.12-slim AS runtime

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# uv: fast, reproducible installer (pinned to match the dev toolchain).
COPY --from=ghcr.io/astral-sh/uv:0.10.6 /uv /usr/local/bin/uv

WORKDIR /app
# Ensure the copied source package (/app/app) is importable by every entrypoint
# (uvicorn, arq, alembic) regardless of how the console script sets sys.path.
ENV PYTHONPATH=/app

# 1) Install dependencies first so this layer is cached unless deps change.
COPY pyproject.toml README.md ./
RUN mkdir -p app && touch app/__init__.py \
    && uv pip install --system --no-cache ".[parsing]"

# 2) Copy the application source (shadows the placeholder package above).
COPY app ./app

# Run as an unprivileged user.
RUN useradd --create-home --uid 10001 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# Default command runs the API. The worker image overrides this in compose.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
