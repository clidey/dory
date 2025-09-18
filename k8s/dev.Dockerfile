FROM node:lts-alpine

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN apk add --no-cache git

COPY package.json pnpm-lock.yaml ./
RUN pnpm i

COPY . .

RUN rm -rf /app/src/data

EXPOSE 3000

CMD ["pnpm", "dev", "--host", "0.0.0.0", "--port", "3000"]