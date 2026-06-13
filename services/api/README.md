# OfferPilot API (`services/api`)

FastAPI **modular monolith** for the OfferPilot student job-matching assistant.
Each bounded context lives under `app/modules/<domain>/` as a vertical slice and
can later be extracted into its own service with minimal churn.

## Layout

```
app/
  shared/      # cross-cutting kernel: config, logging, errors, responses, context
  api/v1/      # HTTP transport — router aggregation + health probes
  modules/     # domain slices (auth, profile, resume, job, match, report, ...)
  ai/          # LLM/embedding providers, prompts, scoring, validators, orchestration
  workers/     # Arq background tasks
  db/          # SQLAlchemy engine/session + Alembic migrations
tests/         # pytest suite
```

**Dependency rule:** `modules -> shared`. Modules never import another module's
`repository`/`models` directly — they collaborate through service interfaces.

## Local development

The backend runs inside the isolated **conda env `offerpilot`** (see the repo
root `environment.yml`). From the repo root:

```bash
make setup-api     # create env + install deps (uv)
make dev-api       # uvicorn with autoreload on :8000
make test-api      # pytest
make lint-api      # ruff check + format check
```

Or manually:

```bash
conda activate offerpilot
cd services/api
uv pip install -e ".[dev]"
uvicorn app.main:app --reload
```

Open http://localhost:8000/docs for the interactive API docs.

## Configuration

All settings come from environment variables / `.env` (`cp .env.example .env`).
See `app/shared/config.py` for the typed schema. The default `AI_PROVIDER=fake`
means the service runs with **no external API keys**.

## Conventions

- **Errors:** raise `AppError(ErrorCode.X, ...)`; handlers render the standard
  `{"error": {...}}` envelope. Add new codes in `app/shared/errors.py`.
- **Responses:** return `envelope(payload)` (`Envelope[T]`) for the standard
  `{"data": ..., "requestId": ..., "timestamp": ...}` shape.
- **Logging:** `get_logger(__name__)`; the current `request_id` is auto-attached.
