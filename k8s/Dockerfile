FROM node:22.16-alpine

WORKDIR /app

# Install git
RUN apk add --no-cache git

COPY ./k8s/config/nginx-default.conf /app/k8s/config/nginx-default.conf

# Install dory globally
RUN npm install -g @clidey/dory@latest
EXPOSE 3000

CMD ["dory", "preview"]