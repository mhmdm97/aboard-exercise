# Abroad Exercise

Monorepo for the Aboard take-home: a book/movie library web app.

```
frontend/  React 19 + TypeScript + Vite
backend/   Fastify + Drizzle + Postgres API
shared/    Zod schemas shared by both
```

Setup and run instructions will be filled in as the app is built. See `docs/TASKS.md` for progress.

## Current state

```bash
npm ci
docker compose up -d db                  # Postgres on :5432
cp backend/.env.example backend/.env
npm run dev                              # API :5000 (Swagger at /api/docs), web :5173
npm run lint && npm run typecheck && npm run build && npm test
```

## Run with Docker

```bash
docker compose up --build      # db + backend + frontend, zero config
```

Open http://localhost:8080 (nginx serves the SPA and proxies `/api` to the backend; API also on :5000).
The backend migrates and seeds on start (`SEED_ON_START=true`). Demo login: `admin@library.local` / `Admin123!`.
Optional overrides are listed in `.env.example` (e.g. `DB_PORT=5433` if 5432 is taken). Reset with `docker compose down -v`.
`docker compose up -d db` alone still gives just the dev database.
