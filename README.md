# Shelf: a book library

Shelf is a book library web app: a React single-page frontend and a Fastify (Node, TypeScript) API on Postgres, with cookie-based login and two roles. It was built for the Aboard senior engineer take-home (brief in `docs/EXERCISE.md`). Design decisions and trade-offs are in [DECISIONS.md](DECISIONS.md).

Mapped to the brief:

- **Auth and roles**: register, log in, log out. `admin` can create, edit and delete books; `member` can browse and keep favourites. Routes and UI actions are guarded on both sides.
- **Search**: debounced search over title, subtitle and author, typo tolerant (Postgres `pg_trgm`), ordered by relevance.
- **Filtering and sorting**: genre (multi), author, year range, minimum rating, sort. Filters live in the URL, so views are shareable.
- **Seeding**: 351 books, 21 genres, plus two demo users. Idempotent.
- **CRUD forms** (admin): create, edit, delete with confirmation, client-side validation from the same Zod schemas the API uses.
- **Favourites** (any logged-in user), infinite scroll, book detail page.
- **Responsive** layout (mobile first, plain CSS modules).
- **Tests**: backend integration tests against a real Postgres, shared-schema tests, frontend component tests (Vitest + React Testing Library).
- **Docker**: one command brings up db, API and the nginx-served frontend.
- **API docs**: OpenAPI generated from the route schemas, Swagger UI at `/api/docs`.

## Quick start (Docker)

```bash
docker compose up --build
```

- App: http://localhost:8080 (nginx serves the SPA and proxies `/api` to the backend)
- Swagger UI: http://localhost:8080/api/docs (the API is also exposed directly on :5000)

The backend runs migrations and seeds on start (`SEED_ON_START=true`, idempotent). Everything has a default, so no `.env` is needed. To override values, copy `.env.example` to `.env`: `DB_PORT=5433` if 5432 is taken, `FRONTEND_PORT`, `BACKEND_PORT`, `POSTGRES_PASSWORD`, and so on. `COOKIE_SECURE` defaults to `false` because compose serves plain http; set it to `true` behind HTTPS. Reset the database with `docker compose down -v`.

Demo accounts (committed on purpose, local use only):

| Email | Password | Role | Can do |
| --- | --- | --- | --- |
| `admin@library.local` | `Admin123!` | admin | Everything a member can, plus create, edit and delete books |
| `member@library.local` | `Member123!` | member | Browse, search, filter, view details, manage favourites |

Anyone can also register at `/register`; self-registration always creates a `member`. Logged-out visitors can browse and search but cannot favourite.

## Local development

Prerequisites: Node 22 and Docker (for Postgres).

```bash
npm ci
docker compose up -d db                 # Postgres on :5432; also creates the library_test database
cp backend/.env.example backend/.env
npm run db:reset -w @library/backend    # migrate + seed (or db:migrate and db:seed separately)
npm run dev                             # API :5000 (Swagger at /api/docs), web http://localhost:5173
```

Vite proxies `/api` to the backend on :5000, so there is no CORS setup in development. To start only one side, use `npm run dev -w @library/backend` or `npm run dev -w abroad-frontend`.

## Tests & checks

From the repo root (each runs in every workspace):

```bash
npm run lint
npm run typecheck
npm run build
npm test
```

Backend tests use a real Postgres. `DATABASE_URL` must point at the test database, which defaults to `library_test` and is created by `db-init/01-create-test-db.sql` when the compose `db` container first starts. A Vitest global setup migrates it, and test files run serially because they share it. CI (`.github/workflows/ci.yml`) runs the same four commands on Node 22 with a `postgres:16` service container.

## Project structure

```
backend/    @library/backend: Fastify 5 + Drizzle (Postgres) API
  src/features/<feature>/   <feature>.routes.ts (thin plugin), .service.ts (logic), .test.ts
  src/db/                   schema, migration runner, seed (books.json + demo users)
  drizzle/                  generated SQL migrations
shared/     @library/shared: Zod schemas and DTO types used by API and frontend
frontend/   React 19 + TypeScript + Vite
  src/api/                  fetch wrapper and one typed function per endpoint
  src/features/<feature>/   pages, components, hooks per feature
  src/components/           shared UI (layout, route guards)
db-init/    creates the library_test database on first container start
docs/       brief, task board, running decisions log (used as agent memory)
```

## API overview

All routes are under `/api`. Errors always look like `{ "error": { "code", "message", "details?" } }`. Full schemas are in Swagger UI.

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | public | Liveness and DB connectivity |
| POST | `/auth/register` | public (rate limited) | Create a member account and log in |
| POST | `/auth/login` | public (rate limited) | Log in (sets httpOnly `sid` cookie) |
| POST | `/auth/logout` | public | Log out (idempotent) |
| GET | `/auth/me` | logged in | Current user |
| GET | `/books` | public | List with `q`, `genre`, `author`, year range, rating, `sort`, pagination |
| GET | `/books/:id` | public | Book detail |
| POST | `/books` | admin | Create a book |
| PUT | `/books/:id` | admin | Replace a book |
| DELETE | `/books/:id` | admin | Delete a book |
| PUT | `/books/:id/favourite` | logged in | Add to favourites (idempotent) |
| DELETE | `/books/:id/favourite` | logged in | Remove from favourites (idempotent) |
| GET | `/me/favourites` | logged in | My favourite books |
| GET | `/me/favourites/ids` | logged in | Ids of my favourites |
| GET | `/genres` | public | All genres |
| GET | `/authors?q=&limit=` | public | Author name autocomplete |

## How it was built

I built this with Claude Code. An orchestrator session planned the work as small tasks in `docs/TASKS.md` and delegated each to an implementer sub-agent, in parallel git worktrees when the tasks touched different areas. `AGENTS.md`, `docs/TASKS.md` and `docs/DECISIONS.md` served as shared memory between sessions. Each task ended with lint, typecheck, build and tests, then a commit; the git history shows the sequence. [DECISIONS.md](DECISIONS.md) covers the choices, the shortcuts and how AI was used.

## What I'd do next

- Ingest real book metadata and covers (Open Library or similar) instead of the hand-written seed, and self-host cover images.
- Image upload for covers in the admin form.
- End-to-end browser tests (Playwright) in CI; today there are component and integration tests only.
- Session hardening: rotating sessions, CSRF tokens, password reset and email verification.
- Cursor (keyset) pagination, observability (log shipping, metrics, tracing), and a deployed instance.
- An accessibility audit and UI polish.
