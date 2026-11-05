FROM node:26-alpine3.24

WORKDIR /app

# Install git
RUN apk add --no-cache git

COPY ./docs/logo/logo.svg /app/docs/logo/logo.svg
COPY ./k8s/config/nginx-default.conf /app/k8s/config/nginx-default.conf

ARG DORY_VERSION=latest
# A newly published version can take time to reach npm's registry mirrors.
# Retry the requested version; never substitute a different release.
RUN set -eu; \
    attempt=1; \
    until npm install -g --registry=https://registry.npmjs.org "@clidey/dory@${DORY_VERSION}"; do \
      if [ "$attempt" -ge 6 ]; then \
        echo "Dory ${DORY_VERSION} could not be installed after ${attempt} attempts." >&2; \
        exit 1; \
      fi; \
      echo "Retrying Dory ${DORY_VERSION} installation in 10 seconds..." >&2; \
      attempt=$((attempt + 1)); \
      sleep 10; \
    done
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --spider -q http://localhost:3000 || exit 1

USER node

CMD ["dory", "preview"]