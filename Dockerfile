FROM node:20-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /build

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

RUN npm ci

COPY . .

RUN npm run build --workspace apps/web
RUN npm run build --workspace apps/api

FROM node:20-slim AS runner

RUN apt-get update && apt-get install -y --no-install-recommends \
    libsqlite3-dev \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

RUN npm ci --omit=dev

COPY --from=builder /build/apps/web/dist ./apps/web/dist
COPY --from=builder /build/apps/api/dist ./apps/api/dist

RUN mkdir -p /app/data \
  && chown -R node:node /app

USER node

EXPOSE 3004

ENV NODE_ENV=production
ENV PORT=3004
ENV DATABASE_PATH=/app/data/webapp.db

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://localhost:3004/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "apps/api/dist/server.js"]
