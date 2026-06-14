# OfferPilot Web (`apps/web`)

React + Vite + TypeScript single-page app for the OfferPilot student
job-matching assistant. Styling uses **Tailwind CSS** with **shadcn/ui**-style
primitives and the design tokens defined in
`docs/04-ai-native-interaction-ui-design.md` (§7.2).

## Layout

```
src/
  app/          # router + global providers + navigation config
  components/
    layout/     # workspace shell (top bar + nav + AI panel)
    ui/         # reusable primitives (button, card, ...) — shadcn-style
  pages/        # route pages
  lib/          # api client, utils (cn)
  styles/       # global Tailwind layer + tokens
  test/         # vitest setup
```

## Local development

The frontend uses an **isolated Node toolchain** managed by `nvm` (Node version
pinned in the repo-root `.nvmrc`). From the repo root:

```bash
make setup-web    # nvm install/use + corepack pnpm + pnpm install
make dev-web      # Vite dev server on http://localhost:5173
make test-web     # vitest
make lint-web     # eslint
```

Or manually:

```bash
nvm install             # installs Node 22 from .nvmrc if needed
nvm use                 # selects Node 22 from .nvmrc
corepack enable
corepack prepare pnpm@9.15.0 --activate
cd apps/web
pnpm install
pnpm dev
```

## Configuration

Copy `.env.example` to `.env`:

| Variable             | Purpose                                                        |
| -------------------- | ------------------------------------------------------------- |
| `VITE_API_BASE_URL`  | Backend API base URL the browser calls.                       |
| `VITE_BASE_PATH`     | Site base path (`/` for root, `/<repo>/` for GH Pages project).|

## Design tokens

The palette is defined once in `tailwind.config.ts` using the exact hex values
from the design spec (Brand Primary `#003F88`, etc.). Use semantic classes:
`bg-primary`, `text-muted-foreground`, `border-border`, `bg-surface`,
`text-critical`, and so on.

## Deployment

- **GitHub Pages (default):** `pnpm build` produces `dist/`; the
  `.github/workflows/deploy-web.yml` workflow publishes it. Set
  `VITE_BASE_PATH=/<repo>/` for project sites.
- **Container:** the `Dockerfile` builds the static site and serves it with
  nginx (used by `infra/docker-compose.yml`).
