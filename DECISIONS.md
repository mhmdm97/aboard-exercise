# DECISIONS

## Architecture & trade-offs

**Books, not movies.** Open Library serves covers by ISBN, so 351 seeded records get real covers without hosting images. Movie posters would have needed an API key and licensing thought.

**npm-workspaces monorepo with a `shared` Zod package.** `@library/shared` holds the schemas and DTO types. One definition drives API request validation, response serialisation, the OpenAPI document and the frontend form validation, so the two sides cannot drift. The alternative was hand-synced types plus a generated client, which is more moving parts for a one-day project. The cost is that `shared` ships as TS source, so the backend bundles it with tsup.

**Fastify over Express.** Schema-first routes with `fastify-type-provider-zod` give typed handlers and Swagger from the same schemas. Express would have needed separate validation and docs layers.

**Postgres + Drizzle over Prisma.** Search leans on Postgres features (`pg_trgm` trigram GIN indexes, `word_similarity`), so I wanted SQL-first access. Drizzle lets me write those expressions inline and keeps migrations as plain SQL files; Prisma's query builder makes that awkward.

**Search.** `q` matches title, subtitle and author with `ILIKE '%q%'` (wildcards escaped) OR trigram `word_similarity > 0.4`, which tolerates typos. With `q` and no explicit `sort`, results are ordered by relevance (best similarity, substring-in-title boosted); otherwise by title. NULLs sort last and `id` breaks ties. I considered Postgres full-text search, but it handles typos and short title fragments worse. An external engine (Elasticsearch, Meilisearch) is overkill at this size.

**Auth.** Server-side sessions in Postgres: an opaque random token in an httpOnly, SameSite=Lax cookie, with only its SHA-256 hash stored. I chose this over a JWT in localStorage for real logout and revocation, and so JS cannot read the token. Passwords use argon2 (`@node-rs/argon2`, prebuilt binaries). Login verifies against a dummy hash for unknown emails to avoid a timing leak, and login/register are rate limited (10 per minute per IP). CSRF protection is SameSite=Lax plus JSON-only bodies (form-encoded requests get 415); there are no CSRF tokens. That is adequate for a same-site app, not for a public one.

**Roles.** `admin` has full book CRUD; `member` browses and keeps favourites. Self-registration always creates a `member`; admins exist only via the seed. Authorisation is enforced in the API (`requireRole` pre-handlers); the UI hides actions only as a convenience.

**Frontend state.** TanStack Query for server state, including auth (`["auth","me"]`, 401 mapped to `null`), with no extra context layer. Library filters live in URL search params, so views are shareable and survive reload. Paging is not in the URL: infinite scroll restarts at page 1 whenever a filter changes. Forms use react-hook-form with the shared Zod schemas.

**Testing.** Backend integration tests run `app.inject()` against a real Postgres (`library_test`), not mocks, because the interesting behaviour (trigram search, transactions, unique constraints) lives in the database. The cost is that tests need a running Postgres; CI uses a service container, and test files run serially because they share one DB. Shared schemas have unit tests, and the frontend has Vitest + React Testing Library component tests.

**Docker.** Multi-stage images on `node:22-slim` (glibc, so the argon2 prebuilds work) and `nginx:alpine`. nginx serves the SPA with fallback and proxies `/api`, which keeps the browser same-origin and avoids CORS. The backend entrypoint migrates, optionally seeds (`SEED_ON_START`, idempotent), then starts, as the non-root `node` user. `COOKIE_SECURE` defaults to true in production, but compose sets it false because secure cookies are never returned over plain http on localhost.

### What I'd do differently in production

- Run migrations as a separate release step, not on container start.
- Real catalogue data from a proper ingestion job, with self-hosted covers.
- Cursor (keyset) pagination, a CDN for static assets, log shipping, metrics and tracing.
- CSRF tokens, rotating sessions, email verification and password reset, an admin invite flow, secrets from a secret manager.
- A deployed environment behind HTTPS (which also lets `COOKIE_SECURE=true` be the default again).
- Browser end-to-end tests in CI.

### Shortcuts I took and why

- **Seed data is hand-written from memory.** The dev sandbox could not reach Open Library (proxy 403), so `books.json` (351 books, 21 genres) was written by hand, with cover URLs built from ISBNs. I validated and repaired the ISBN-13 check digits with a script, but some ISBNs may not match the exact edition, so some covers may be missing; the UI falls back to a generated cover. No fetch script is committed because I could not test it. Pre-1 AD works have `publishedYear = null`.
- **Ratings are synthetic.** `averageRating` is derived deterministically (2.50 to 5.00) from a SHA-256 of the ISBN. It exists so the rating filter and sort have data; it is not real.
- **Offset pagination.** Simple and fine for 351 rows; it degrades on deep pages and can skip or repeat rows if data changes mid-scroll.
- **No email verification or password reset**, and no admin management UI. The demo users are committed in the seed and README on purpose.
- **Migrate and seed on container start.** Fine for one container, racy with several replicas.
- **No end-to-end tests in CI.** I ran the app in a real browser with Playwright, but those runs are not committed.
- **Book updates are a full replace (PUT), last write wins**, with no optimistic concurrency.
- **Test coverage is uneven.** Every endpoint has integration tests, but the frontend has no end-to-end tests in CI: the full flows were checked with throwaway Playwright scripts, not a committed suite.
- **Accessibility and polish are partial.** Labels and semantics are in place, but I did no systematic audit and skipped animation.
- **Helmet CSP is disabled outside production** so Swagger UI works.
- **Deployment skipped.** The brief marks it optional.

## AI usage

**Tools.** Claude Code only. The main session ran an Opus model as an orchestrator that planned tasks, reviewed diffs and kept `docs/` current; it did not write feature code. Each task from `docs/TASKS.md` went to an `implementer` sub-agent on Sonnet with a self-contained prompt (acceptance criteria, files, DTO shapes, patterns to follow). Independent tasks (for example the library page alongside the book read endpoints) ran in parallel in separate git worktrees and were merged afterwards; the history has the "Merge ..." commits. `AGENTS.md`, `docs/TASKS.md` and `docs/DECISIONS.md` were the shared memory between sessions.

**What was delegated.** Nearly all code: scaffolding, schema and migrations, seed data, endpoints, tests, frontend pages, Dockerfiles. I owned the stack choices, the roles model, the search design and the trade-offs above, and reviewed each task before it was committed.

**How it was verified.** Every task had to pass lint, typecheck, build and tests before commit. Backend behaviour is covered by integration tests on a real Postgres. UI flows were exercised in a real browser with Playwright runs. The Docker setup was verified by actually running `docker compose up`: images built, services healthy, migrate and seed on first start and on restart, SPA fallback and `/api` proxy through nginx, login, and Swagger (recorded in `docs/DECISIONS.md`).

**Where AI output was corrected, and why** (each is visible in the history or `docs/DECISIONS.md`):

- **Relevance sorting.** The list endpoint needed a way to rank by relevance when searching. The shortcut was a hack in the request itself; I had it replaced by making `sort` optional in the shared schema, so the service picks relevance (with `q`) or title, and an explicit `sort` always wins. The frontend omits `sort` until the user picks one. See commit `4a4d8ff`.
- **`useFieldArray` did not fit.** The natural choice for the repeating author field is `useFieldArray`, but it only holds arrays of objects and `authorNames` is a `string[]` in the shared schema. The form controls the list with `useWatch`/`setValue` instead of reshaping the shared contract to suit the form library.
- **Docker was initially unverifiable.** The Dockerfiles and compose were first written without a run to prove them. I did not accept the task until a real `docker compose up` worked; the result, including the `node:22-slim` choice and the `COOKIE_SECURE` setting for plain http, is in the decisions log.
- **Seed ISBNs.** The generated ISBNs had invalid check digits in places; they were validated and repaired by script. The remaining limitation (some editions or covers may not match) is stated above rather than hidden.
- **Unrequested major version.** I asked for react-router 7; the agent installed 8 without flagging it. The APIs used are unchanged, so I kept it, but logged it rather than letting the drift pass silently.
- **Lockfile churn.** An early `npm install` in the sandbox rewrote `package-lock.json` for a different npm version (dropping platform `libc` metadata). It was unrelated to the change, so I reverted it before committing.

> **TODO (author):** add your own examples of AI output you rejected or rewrote, and why.
