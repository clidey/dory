FROM node:26.12.1-alpine3.24 AS builder

RUN npm install -g pnpm@12.13.0
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build:docs && pnpm run build:server

# The Node server can report page and AI crawler requests to PostHog.
FROM node:26.12.1-alpine3.24
WORKDIR /app
COPY --from=builder /app/dist-server ./server
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/docs ./docs
COPY --from=builder /app/docs/dory.json ./dory.json
COPY --from=builder /app/package.json ./package.json

ENV PORT=8080
USER node
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --spider -q http://127.0.0.1:8080/ || exit 1

CMD ["node", "server/server.js"]
