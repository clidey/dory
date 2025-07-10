FROM node:22.16-alpine

WORKDIR /app

COPY ./k8s/config/nginx-default.conf /app/k8s/config/nginx-default.conf

# Install dory globally
RUN npm install -g @clidey/dory
EXPOSE 3000

CMD ["dory", "preview"]