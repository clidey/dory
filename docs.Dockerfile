# Dockerfile.docs
# Builds and serves the Dory documentation site.
#
# Build: docker build -f Dockerfile.docs -t dory-docs .
# Run:   docker run -p 8080:8080 dory-docs

# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:24.22.1-alpine3.24 AS builder

RUN npm install -g pnpm@12.13.0

WORKDIR /app

# Install dependencies first (cached layer)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY . .
RUN pnpm run build:docs

# ─── Stage 2: Serve ───────────────────────────────────────────────────────────
FROM nginx/nginx-unprivileged:stable-alpine AS runtime

# Copy built site
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config (handles SPA routing with try_files)
COPY k8s/config/nginx-default.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
