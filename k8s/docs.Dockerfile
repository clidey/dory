FROM node:26.12.1-alpine3.24 AS builder

RUN npm install -g pnpm@12.13.0
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build:docs

FROM nginx/nginx-unprivileged:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY --from=builder /app/k8s/config/nginx-default.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"] 