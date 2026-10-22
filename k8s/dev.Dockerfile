FROM node:26.3.0-alpine3.22

WORKDIR /app
RUN npm install -g pnpm@12.13.0
RUN apk add --no-cache git

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm i

COPY . .

RUN rm -rf /app/src/data

EXPOSE 3000

CMD ["pnpm", "dev", "--host", "0.0.0.0", "--port", "3000"]