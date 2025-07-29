FROM node:22.16-alpine

WORKDIR /app

# Install git
RUN apk add --no-cache git

COPY ./docs/logo/logo.svg /app/docs/logo/logo.svg
COPY ./k8s/config/nginx-default.conf /app/k8s/config/nginx-default.conf

RUN npm install -g @clidey/dory@0.20.0
EXPOSE 3000

CMD ["dory", "preview"]