# Dockerfile.docs
# Builds and serves the Dory documentation site.
#
# Build: docker build -f Dockerfile.docs -t dory-docs .
# Run:   docker run -p 80:80 dory-docs

# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:24.11.1-alpine3.22 AS builder

RUN corepack enable && corepack prepare pnpm@10.10.0 --activate

WORKDIR /app

# Install dependencies first (cached layer)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY . .
RUN pnpm run build:docs

# ─── Stage 2: Serve ───────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

# Copy built site
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config (handles SPA routing with try_files)
COPY k8s/config/nginx-default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
