# syntax=docker/dockerfile:1
# ---------------------------------------------------------------------------
# OfferPilot Web — production image.
#
# NOTE: The primary deployment target for the frontend is GitHub Pages (static
# build via `pnpm build`). This image is provided for self-hosted / container
# deployments and for the full docker-compose stack.
# ---------------------------------------------------------------------------
FROM node:22-alpine AS build

# Enable pnpm via corepack (pinned for reproducibility).
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

# Install dependencies first (cached unless manifest changes).
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install

# Build the static site.
COPY . .
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_BASE_PATH=/
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_BASE_PATH=$VITE_BASE_PATH
RUN pnpm build

# --- Runtime: static files served by nginx ---
FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
