FROM node:26-alpine3.24

WORKDIR /app

# Install git
RUN apk add --no-cache git

COPY ./docs/logo/logo.svg /app/docs/logo/logo.svg
COPY ./k8s/config/nginx-default.conf /app/k8s/config/nginx-default.conf

ARG DORY_VERSION=latest
RUN npm install -g @clidey/dory@${DORY_VERSION}
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --spider -q http://localhost:3000 || exit 1

USER node

CMD ["dory", "preview"]