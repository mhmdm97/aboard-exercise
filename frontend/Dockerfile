# Build context: repo root.
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci -w abroad-frontend -w @library/shared --include-workspace-root
COPY tsconfig.base.json ./
COPY shared shared
COPY frontend frontend
RUN npm run build -w abroad-frontend

FROM nginx:alpine
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
