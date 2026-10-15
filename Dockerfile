# Multi-stage Docker build for QuizArena (Frontend + Backend + WebSockets)
# Using node:20-slim (Debian-based) for better native module compatibility

# ─── Stage 1: Build Client ───────────────────────────────────────────────────
FROM node:20-slim AS client-build

WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

# ─── Stage 2: Build Server ───────────────────────────────────────────────────
FROM node:20-slim AS server-build

WORKDIR /app/server

COPY server/package*.json ./
RUN npm ci

COPY server/ ./
RUN npm run build

# ─── Stage 3: Production Runner ──────────────────────────────────────────────
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Copy server production deps + compiled output
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

COPY --from=server-build /app/server/dist ./server/dist

# Copy compiled client static files
COPY --from=client-build /app/client/dist ./client/dist

EXPOSE 8080

WORKDIR /app/server
CMD ["node", "dist/index.js"]
