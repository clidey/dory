FROM node:22.16-alpine

WORKDIR /app

# Install dory globally
RUN npm install -g @clidey/dory
EXPOSE 3000

CMD ["dory", "preview"]