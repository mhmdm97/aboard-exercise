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
