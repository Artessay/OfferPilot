# ===========================================================================
# OfferPilot — developer task runner
#
# Two isolated toolchains are used on the DEV machine:
#   * Python backend  -> conda env "offerpilot"   (see environment.yml)
#   * Node frontend   -> nvm + Node 22            (see .nvmrc)
#
# Every target below loads the right toolchain explicitly so you never have to
# remember to `conda activate` / `nvm use` first. For deployment use Docker
# (see `make docker-*` targets and infra/docker-compose.yml).
# ===========================================================================

CONDA_ENV  ?= offerpilot
CONDA_RUN  := conda run -n $(CONDA_ENV) --no-capture-output
API_DIR    := services/api
WEB_DIR    := apps/web
PNPM_VERSION ?= 9.15.0

# Load nvm + the project Node version for any frontend command.
NVM_LOAD := export NVM_DIR="$$HOME/.nvm"; \
	if [ ! -s "$$NVM_DIR/nvm.sh" ]; then \
		printf '%s\n' 'nvm is required for frontend commands. Install it with:' '  curl -fsSL -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash' 'Then rerun make setup-web.' >&2; \
		exit 127; \
	fi; \
	. "$$NVM_DIR/nvm.sh"; \
	nvm use >/dev/null 2>&1 || nvm install; \
	nvm use >/dev/null;
PNPM_SETUP := corepack enable >/dev/null && corepack prepare pnpm@$(PNPM_VERSION) --activate >/dev/null;

.DEFAULT_GOAL := help

# ---------------------------------------------------------------------------
.PHONY: help
help: ## Show this help
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| sort \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}'

# ---------------------------------------------------------------------------
# Environment bootstrap (run once on a fresh machine)
# ---------------------------------------------------------------------------
.PHONY: setup
setup: setup-api setup-web ## Bootstrap both backend and frontend dev environments

.PHONY: setup-api
setup-api: ## Create conda env (if missing) and install backend deps via uv
	@conda env list | grep -q "^$(CONDA_ENV) " || conda env create -f environment.yml
	$(CONDA_RUN) bash -c 'cd $(API_DIR) && uv pip install -e ".[dev]"'

.PHONY: setup-web
setup-web: ## Install frontend deps with pnpm (Node pinned by .nvmrc)
	$(NVM_LOAD) $(PNPM_SETUP) cd $(WEB_DIR) && pnpm install

# ---------------------------------------------------------------------------
# Run (local, no Docker)
# ---------------------------------------------------------------------------
.PHONY: dev-api
dev-api: ## Run the API with autoreload on :8000
	$(CONDA_RUN) bash -c 'cd $(API_DIR) && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000'

.PHONY: dev-worker
dev-worker: ## Run the Arq background worker
	$(CONDA_RUN) bash -c 'cd $(API_DIR) && arq app.workers.main.WorkerSettings'

.PHONY: dev-web
dev-web: ## Run the Vite dev server on :5173
	$(NVM_LOAD) $(PNPM_SETUP) cd $(WEB_DIR) && pnpm dev

# ---------------------------------------------------------------------------
# Lightweight DEBUG mode (SQLite, no Docker, no Postgres/Redis)
#   For concept-stage demos: one command, offline AI, file-based SQLite.
#   These values are injected inline so debug mode never touches your real
#   .env or a Postgres database.
# ---------------------------------------------------------------------------
DEBUG_ENV := DATABASE_URL=sqlite+aiosqlite:///./offerpilot_debug.db \
             AUTO_CREATE_DB=true \
             AI_PROVIDER=fake \
             ENVIRONMENT=local \
             JWT_SECRET=debug-insecure-secret-change-me-0123456789 \
             LOG_JSON=false

.PHONY: debug
debug: ## Run a lightweight SQLite backend (no Docker) + demo data on :8000
	$(CONDA_RUN) bash -c 'cd $(API_DIR) && export $(DEBUG_ENV) && python -m app.scripts.seed_demo && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000'

.PHONY: seed-debug
seed-debug: ## Seed the demo account + sample data into the SQLite debug DB
	$(CONDA_RUN) bash -c 'cd $(API_DIR) && export $(DEBUG_ENV) && python -m app.scripts.seed_demo'

.PHONY: reset-debug
reset-debug: ## Delete the SQLite debug DB + local storage for a fresh start
	rm -f $(API_DIR)/offerpilot_debug.db $(API_DIR)/offerpilot_debug.db-shm $(API_DIR)/offerpilot_debug.db-wal
	rm -rf $(API_DIR)/storage_data
	@echo "debug database and local storage removed"

# ---------------------------------------------------------------------------
# Quality gates
# ---------------------------------------------------------------------------
.PHONY: lint
lint: lint-api lint-web ## Lint everything

.PHONY: lint-api
lint-api: ## Ruff lint + format check (backend)
	$(CONDA_RUN) bash -c 'cd $(API_DIR) && ruff check . && ruff format --check .'

.PHONY: lint-web
lint-web: ## ESLint (frontend)
	$(NVM_LOAD) $(PNPM_SETUP) cd $(WEB_DIR) && pnpm lint

.PHONY: format
format: ## Auto-format backend code
	$(CONDA_RUN) bash -c 'cd $(API_DIR) && ruff format . && ruff check --fix .'

.PHONY: typecheck
typecheck: ## mypy (backend) + tsc (frontend)
	$(CONDA_RUN) bash -c 'cd $(API_DIR) && mypy app'
	$(NVM_LOAD) $(PNPM_SETUP) cd $(WEB_DIR) && pnpm typecheck

.PHONY: test
test: test-api test-web ## Run all tests

.PHONY: test-api
test-api: ## pytest (backend)
	$(CONDA_RUN) bash -c 'cd $(API_DIR) && pytest'

.PHONY: test-web
test-web: ## vitest (frontend)
	$(NVM_LOAD) $(PNPM_SETUP) cd $(WEB_DIR) && pnpm test

# ---------------------------------------------------------------------------
# Database migrations (backend)
# ---------------------------------------------------------------------------
.PHONY: migrate
migrate: ## Apply Alembic migrations
	$(CONDA_RUN) bash -c 'cd $(API_DIR) && alembic upgrade head'

.PHONY: migration
migration: ## Create a new autogenerated migration: make migration m="message"
	$(CONDA_RUN) bash -c 'cd $(API_DIR) && alembic revision --autogenerate -m "$(m)"'

# ---------------------------------------------------------------------------
# Docker (deployment artifacts)
# ---------------------------------------------------------------------------
.PHONY: docker-up
docker-up: ## Build & start the full stack (db, redis, api, worker, web)
	cd infra && docker compose up --build -d

.PHONY: docker-down
docker-down: ## Stop the stack
	cd infra && docker compose down

.PHONY: docker-logs
docker-logs: ## Tail stack logs
	cd infra && docker compose logs -f

.PHONY: build
build: ## Build production artifacts (web static + api image)
	$(NVM_LOAD) $(PNPM_SETUP) cd $(WEB_DIR) && pnpm build
	cd infra && docker compose build api worker
