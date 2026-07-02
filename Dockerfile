# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine AS runner

ENV NODE_ENV=production \
    PORT=4000 \
    PUBLIC_BASE_URL=http://localhost:4000 \
    UPLOAD_DIR=/app/storage/uploads \
    CHUNK_DIR=/app/storage/chunks

WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=build --chown=appuser:appgroup /app/package*.json ./
COPY --from=build --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=build --chown=appuser:appgroup /app/src ./src
COPY --from=build --chown=appuser:appgroup /app/public ./public

RUN mkdir -p /app/storage/uploads /app/storage/chunks \
    && chown -R appuser:appgroup /app/storage

USER appuser

EXPOSE 4000

VOLUME ["/app/storage"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 4000) + '/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["npm", "start"]
