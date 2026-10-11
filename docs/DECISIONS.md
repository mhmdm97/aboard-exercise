# Decisions & assumptions

One line per entry, newest at the bottom. Format: `- [area] decision: reason`.

- [stack] .NET 10 minimal API + React 19/TS/Vite monorepo: chosen ahead of time for the exercise.
- [backend] Feature-folder minimal APIs, no extra layered projects: keeps the code small and readable under time pressure.
- [frontend] Vite dev proxy for `/api` → backend:5000 instead of relying on CORS (a CORS policy also exists for direct calls).
- [stack] Removed the .NET boilerplate: the brief requires a Node API (supersedes the .NET entries above).
- [domain] Books, not movies: Open Library serves covers by ISBN (`https://covers.openlibrary.org/b/isbn/<isbn>-M.jpg`), so 200+ seeded records get real covers cheaply.
- [repo] npm workspaces: `frontend/`, `backend/`, `shared/`. `shared` (`@library/shared`) holds Zod schemas + inferred DTO types used by both API validation and frontend forms, exported as TS source (Vite/tsx/Vitest compile it; the backend prod build bundles it with tsup).
- [runtime] Node 22 LTS everywhere (Docker, CI), ESM only, TypeScript strict.
- [backend] Fastify 5 + `fastify-type-provider-zod`: schema-validated, typed routes, and the same schemas generate OpenAPI (`@fastify/swagger` + Swagger UI at `/api/docs`).
- [db] PostgreSQL 16 + Drizzle ORM (drizzle-kit migrations). SQL-first and close to the metal, so Postgres features (pg_trgm / full-text search) stay easy to use.
- [auth] Server-side sessions stored in Postgres; opaque random token in an httpOnly, SameSite=Lax cookie (only its SHA-256 hash stored). Passwords hashed with argon2 (`@node-rs/argon2`, prebuilt, no node-gyp). Chosen over JWT-in-localStorage: real logout/revocation, no token readable by JS.
- [roles] `admin`: full CRUD on books (and lookups). `member`: browse/search/filter + personal favourites. Self-registration always creates `member`; admins come from the seed.
- [tests] Vitest in all workspaces. Backend integration tests use `app.inject()` against a real Postgres test DB (`DATABASE_URL` of a test database); CI uses a Postgres service container. Frontend: Vitest + React Testing Library.
- [frontend] react-router + TanStack Query for server state; react-hook-form + zodResolver with the shared schemas; plain CSS modules, mobile-first.
- [versions] fastify 5.12, zod 4.6 (fastify-type-provider-zod 7 supports zod >=4.1.5), drizzle-orm 0.45, vitest 5, tsup 8; frontend dependency majors unchanged.
- [backend] Backend tests live next to the code as `<feature>.test.ts`; `buildApp({ env, db })` takes its dependencies so tests use `app.inject()`.
- [backend] Helmet CSP is disabled outside production so Swagger UI works; ESLint for backend+shared lives in the root `eslint.config.js` (frontend keeps its own).
- [ci] Single CI job on Node 22 with a `postgres:16` service (`library_test`); `.gitignore` allows `.env.*.example` files.
- [db] Migrations: `0000_pg_trgm` (custom: `CREATE EXTENSION pg_trgm`) runs before `0001_schema` so the trigram GIN indexes (books.title, authors.name) can be created; `averageRating` is `numeric(3,2)` mapped to a JS number.
- [seed] Open Library was unreachable from the dev sandbox (proxy 403), so `backend/src/db/seed/books.json` (351 real books, 21 genres) is hand-written with `coverUrl = https://covers.openlibrary.org/b/isbn/<isbn>-M.jpg`; ISBN-13 check digits were validated/repaired by script, so a few ISBNs may not match the exact edition (cover may be missing). No fetch script was committed (untestable here). Pre-1 AD works have `publishedYear = null`.
- [seed] `average_rating` is deterministic (2.50-5.00 from SHA-256 of the ISBN), not real ratings. Seed logic is `src/db/seed-library.ts` (`seedLibrary(db)`, idempotent, one transaction); `seed.ts` is the CLI entry (also built to `dist/db/seed.js`, JSON bundled by tsup).
- [tests] Backend Vitest uses a `globalSetup` that migrates the test DB; test files run serially (`fileParallelism: false`) since they share one DB; use `createTestDb()`/`truncateAll()` from `src/test/db.ts`. Shared schema tests live in `shared/` (vitest added).
- [shared] `bookInputSchema` normalises (trims, strips ISBN hyphens, blank optionals become null, `genreSlugs` defaults to `[]`); `bookListQuerySchema.genre` accepts repeated or comma-separated values.
- [frontend] Router: react-router 8 data router (`createBrowserRouter`, routes in `src/routes.tsx`); TanStack Query defaults staleTime 30s, no retry on 4xx; devtools in dev only. Vitest + RTL + jsdom for frontend tests.
- [auth] Sessions: 32-byte base64url token, 7-day TTL (`SESSION_TTL_DAYS`), cookie `sid` unsigned (token is opaque random); expired sessions deleted lazily. Login verifies against a dummy argon2 hash for unknown emails (no timing leak); register/login rate-limited 10/min/IP (off in tests).
- [auth] CSRF: SameSite=Lax cookie + JSON-only bodies (Fastify has no form-urlencoded parser, so those get 415); no CSRF tokens.
- [seed] Demo users `admin@library.local` / `Admin123!` (admin, "Ada Admin") and `member@library.local` / `Member123!` (member, "Max Member"): committed on purpose for the README; `db:seed` re-resets them.
- [search] `q` matches title/subtitle/author via `ILIKE '%q%'` (LIKE wildcards escaped) OR pg_trgm `word_similarity(q, title|author.name) > 0.4` (typo tolerant). Because `bookListQuerySchema` defaults `sort` to `title`, the route checks the raw URL: if the caller passed no `sort`, results are ordered by relevance (best similarity, substring-in-title boosted); an explicit `sort` always wins. NULLs always sort last; `id` is the final tiebreaker.
- [api] `GET /api/authors?q=&limit=` is a plain substring ILIKE (default limit 20, max 50) ordered by name; `GET /api/genres` returns all genres by name (no bookCount). Genre/author lookups live in `features/lookups/`.
- [frontend] Library filters live in URL search params (replace history); paging is not in the URL (infinite scroll restarts at page 1 on any filter change). Year inputs commit on blur/Enter; search is debounced 300 ms. `sort` is omitted from requests until the user picks one so the server can rank by relevance. Open Library cover URLs get `?default=false` and fall back to a generated cover on error. "Clear filters" also clears the search text.
- Auth state lives only in the TanStack Query cache (`["auth","me"]`, 401 mapped to `null`); no React context. Forms use react-hook-form + zodResolver with the shared schemas. `?redirect=` accepts only paths starting with a single `/`.
- Book detail shows authors as plain text because the Library filters have no `author` param yet; genre chips link to `/?genre=<slug>`.
- Delete success navigates to `/` with router state `{ message }`, announced in a polite `role="status"` region on the Library page.
