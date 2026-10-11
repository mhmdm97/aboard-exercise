# Build context: repo root (docker compose sets this). Debian slim rather than alpine:
# @node-rs/argon2 ships glibc prebuilt binaries, so this avoids any musl surprises.
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci -w @library/backend -w @library/shared --include-workspace-root
COPY tsconfig.base.json ./
COPY shared shared
COPY backend backend
RUN npm run build -w @library/backend

FROM node:22-slim AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci --omit=dev -w @library/backend

FROM node:22-slim
ENV NODE_ENV=production PORT=5000
WORKDIR /app/backend
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY backend/package.json ./
COPY --from=build /app/backend/dist ./dist
COPY backend/drizzle ./drizzle
COPY backend/docker-entrypoint.sh ./
USER node
EXPOSE 5000
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["./docker-entrypoint.sh"]
