# Infrastructure (`infra/`)

Container orchestration for local development and self-hosted deployment.

## Contents

| File                  | Purpose                                                       |
| --------------------- | ------------------------------------------------------------- |
| `docker-compose.yml`  | Full stack: Postgres (pgvector), Redis, API, worker, web.     |
| `postgres/init.sql`   | Enables the `vector` extension on first DB init.              |
| `.env.example`        | Variables consumed by compose (copy to `.env`).               |

## Usage

```bash
cd infra
cp .env.example .env          # adjust secrets for non-local use
docker compose up --build -d  # start everything
docker compose logs -f api    # tail API logs
docker compose down           # stop (add -v to also drop the db volume)
```

Or from the repo root: `make docker-up` / `make docker-down` / `make docker-logs`.

## Services & ports

| Service | Image / build        | Host port | Notes                                  |
| ------- | -------------------- | --------- | -------------------------------------- |
| db      | `pgvector/pgvector`  | 5432      | Postgres 16 + pgvector.                |
| redis   | `redis:7-alpine`     | 6379      | Cache + Arq task queue.                |
| api     | `services/api`       | 8000      | FastAPI; `/api/v1/health`, `/docs`.    |
| worker  | `services/api`       | —         | Arq background worker (same image).    |
| web     | `apps/web`           | 8080      | Static SPA served by nginx.            |

## Notes

- **Datastores only:** `docker compose up db redis` lets you run the API and
  web from the host (conda + nvm) against containerised Postgres/Redis.
- **Migrations:** Alembic migrations are applied via `make migrate` (or an API
  entrypoint step) once the database schema lands in phase P1.
- **Production:** override `.env` secrets, set `AI_PROVIDER`/`AI_API_KEY` for a
  real LLM, and front the stack with TLS termination (e.g. a reverse proxy).
