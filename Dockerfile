# Multi-stage Docker build for QuizArena (Frontend + Backend + WebSockets)
FROM node:20-alpine AS build

WORKDIR /app

# 1. Build Client
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN chmod -R +x node_modules/.bin && npm run build

# 2. Build Server
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci

COPY server/ ./
RUN chmod -R +x node_modules/.bin && npm run build

# --- Production Runner ---
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY --from=build /app/server/package*.json ./server/
RUN cd server && npm ci --only=production

COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/client/dist ./client/dist

EXPOSE 8080

WORKDIR /app/server
CMD ["node", "dist/index.js"]
