# DECISIONS

## Architecture & trade-offs

**Books, not movies.** Open Library has real book metadata and serves covers by cover ID, so 383 seeded records get real covers without hosting images. Movie posters would have needed an API key and licensing thought.

**npm-workspaces monorepo with a `shared` Zod package.** `@library/shared` holds the schemas and DTO types. One definition drives API request validation, response serialisation, the OpenAPI document and the frontend form validation, so the two sides cannot drift. The alternative was hand-synced types plus a generated client, which is more moving parts for a one-day project. The cost is that `shared` ships as TS source, so the backend bundles it with tsup.

**Fastify over Express.** Schema-first routes with `fastify-type-provider-zod` give typed handlers and Swagger from the same schemas. Express would have needed separate validation and docs layers.

**Postgres + Drizzle over Prisma.** Search leans on Postgres features (`pg_trgm` trigram GIN indexes, `word_similarity`), so I wanted SQL-first access. Drizzle lets me write those expressions inline and keeps migrations as plain SQL files; Prisma's query builder makes that awkward.

**Search.** `q` matches title, subtitle and author with `ILIKE '%q%'` (wildcards escaped) OR the trigram `<%` operator (word similarity above 0.4, set via a transaction-local `pg_trgm.word_similarity_threshold`), which tolerates typos and, unlike a `word_similarity()` call, can use the GIN trigram indexes. With `q` and no explicit `sort`, results are ordered by relevance (best similarity, substring-in-title boosted); otherwise by title. NULLs sort last and `id` breaks ties. I considered Postgres full-text search, but it handles typos and short title fragments worse. An external engine (Elasticsearch, Meilisearch) is overkill at this size.

**Auth.** Server-side sessions in Postgres: an opaque random token in an httpOnly, SameSite=Lax cookie, with only its SHA-256 hash stored. I chose this over a JWT in localStorage for real logout and revocation, and so JS cannot read the token. Passwords use argon2 (`@node-rs/argon2`, prebuilt binaries). Login verifies against a dummy hash for unknown emails to avoid a timing leak, and login/register are rate limited (10 per minute per IP). CSRF protection is SameSite=Lax plus JSON-only bodies (form-encoded requests get 415); there are no CSRF tokens. That is adequate for a same-site app, not for a public one.

**Roles.** `admin` has full book CRUD; `member` browses and keeps favourites. Self-registration always creates a `member`; admins exist only via the seed. Authorisation is enforced in the API (`requireRole` pre-handlers); the UI hides actions only as a convenience.

**Frontend state.** TanStack Query for server state, including auth (`["auth","me"]`; `/api/auth/me` returns 200 with `user: null` for anonymous visitors), with no extra context layer. Library filters live in URL search params, so views are shareable and survive reload. Paging is not in the URL: infinite scroll restarts at page 1 whenever a filter changes. Forms use react-hook-form with the shared Zod schemas.

**Design and motion.** The UI is a bespoke "Shelf" design (Fraunces and Instrument Sans, paper/oxblood and ink/rose themes, generated cloth covers) rather than a component library, to keep the bundle small and the look intentional. Fonts are self-hosted (`@fontsource-variable`) because the nginx CSP is `font-src 'self'`; Google Fonts would have meant loosening it. Theme follows the OS, with a manual System/Light/Dark toggle; a tiny synchronous `theme-init.js` (allowed by `script-src 'self'`, so no inline script) sets it before first paint to avoid a flash. Motion is CSS plus the View Transitions API instead of an animation library: the cover morphs from card to detail page and the route cross-fades, and React Router also runs it on browser back/forward. Browsers without the API (Firefox before 144) navigate instantly, and `prefers-reduced-motion` disables the transitions and every animation. Cards reveal on scroll through a single shared `IntersectionObserver` that sets a data attribute on each node once; a mount-time animation would have played off-screen because infinite scroll mounts the next page early. The first row of covers never fades in (only rises), since Chrome ignores opacity-0 elements as LCP candidates. Zod's JIT probe tripped the CSP (`unsafe-eval`), so the frontend sets `z.config({ jitless: true })` rather than relaxing the policy. Accessibility was checked with axe (0 violations on the main screens, both themes) and Lighthouse (a11y 100).

**Observability.** Every response carries an `x-request-id`: nginx forwards its `$request_id`, the API reuses a well-formed incoming id (a strict pattern, so a client cannot inject into logs) or generates a UUID, and logs carry it as `requestId`, so a browser-visible id leads straight to the log line. Pino redacts cookie, authorization and set-cookie headers, and 500s return a generic message. There are no metrics or tracing yet.

**Testing.** Backend integration tests run `app.inject()` against a real Postgres (`library_test`), not mocks, because the interesting behaviour (trigram search, transactions, unique constraints) lives in the database. The cost is that tests need a running Postgres; CI uses a service container, and test files run serially because they share one DB. Shared schemas have unit tests, the frontend has Vitest + React Testing Library component tests, and a small Playwright suite (`e2e/`) drives the built app through the `vite preview` proxy against a dedicated `library_e2e` database. It exists because a dev-proxy Origin bug (403 on login) was invisible to `app.inject()` tests. It is a separate workspace run by `npm run test:e2e`, and as its own CI job, so `npm test` stays fast and needs no browser.

**Docker.** Multi-stage images on `node:22-slim` (glibc, so the argon2 prebuilds work) and `nginx:alpine`. nginx serves the SPA with fallback and proxies `/api`, which keeps the browser same-origin and avoids CORS. The backend entrypoint migrates, optionally seeds (`SEED_ON_START`, idempotent), then starts, as the non-root `node` user. `COOKIE_SECURE` defaults to true in production, but compose sets it false because secure cookies are never returned over plain http on localhost.

**Security** (on top of Auth). The cookie is `Secure` in production unless `COOKIE_SECURE=false`; expiry is enforced server-side, logout deletes the row, and every login mints a new token and purges expired rows. `role` is never read from register input. Guards: `requireRole('admin')` on book writes, `requireAuth` on favourites, which are always keyed by `req.user.id` (no IDOR). All SQL is parameterised (`ilike` input is escaped; the only `sql.raw` is a fixed `asc`/`desc`). Zod bounds every param, query and body field; `coverUrl` must be http(s) and is only rendered as `<img src>`; there is no `dangerouslySetInnerHTML`; the body limit is Fastify's 1 MB default. CSRF: SameSite=Lax means browsers send no session cookie on cross-site POST/PUT/DELETE, JSON-only bodies stop form posts (415), and an `Origin` hook (`app.ts`) rejects unsafe methods from a foreign origin, which also covers bodyless logout and favourite PUT/DELETE. Production helmet CSP works with Swagger UI (it ships no inline scripts), so docs stay on. nginx adds nosniff, frame deny, referrer policy and a CSP (`img-src` allows any https host because admins may enter arbitrary cover URLs and Open Library redirects to archive.org) and hides its version. `npm audit --omit=dev` reports 0 vulnerabilities. Compose DB credentials are local-only defaults; `.env` is git-ignored.
Production follow-ups: CSRF tokens; per-account lockout and a shared (Redis) rate-limit store behind a trusted-proxy setting; session rotation, a per-user session cap and a scheduled expiry job; password breach check, email verification and reset; HSTS at the TLS edge; secrets from a secret manager and a non-default DB password; audit logging of admin writes; an image proxy if hotlinking covers is a concern.

### What I'd do differently in production

- Run migrations as a separate release step, not on container start.
- Real catalogue data from a proper ingestion job, with self-hosted covers.
- Cursor (keyset) pagination, a CDN for static assets, log shipping, metrics and tracing.
- CSRF tokens, rotating sessions, email verification and password reset, an admin invite flow, secrets from a secret manager.
- A deployed environment behind HTTPS (which also lets `COOKIE_SECURE=true` be the default again).
- Broader browser coverage: the e2e suite is a small smoke set (Chromium only, no mobile viewport, no visual checks).

### Shortcuts I took and why

- **Seed data is a snapshot.** `books.json` (383 books, 21 genres) is real Open Library data, fetched by a committed script (`npm run seed:fetch -w @library/backend`) and then checked in, so normal development and CI need no network. Titles, authors, years, page counts, descriptions and cover IDs come from Open Library; genres are mapped from its subjects with a fixed list of must-have titles, so they are my approximation. A few descriptions fall back to a one-line summary where Open Library has none. Pre-1 AD works would have `publishedYear = null`.
- **Ratings are Open Library community averages** where a book has at least 5 ratings (all but 3 of the 383 here); the rest get a deterministic synthetic value (2.50 to 5.00 from a SHA-256 of the ISBN) so the rating filter and sort always have data.
- **Offset pagination.** Simple and fine for 383 rows; it degrades on deep pages and can skip or repeat rows if data changes mid-scroll.
- **No email verification or password reset**, and no admin management UI. The demo users are committed in the seed and README on purpose.
- **Migrate and seed on container start.** Fine for one container, racy with several replicas.
- **The end-to-end suite is small.** Four Playwright specs (browse, auth, favourites, admin) run in CI against the built app through `vite preview`, not the Docker stack, and only on Chromium.
- **Book updates are a full replace (PUT), last write wins**, with no optimistic concurrency.
- **Accessibility is automated-only.** axe and Lighthouse are clean, but I did no screen-reader or manual keyboard audit. The cover morph needs the View Transitions API and degrades to instant navigation elsewhere.
- **Helmet CSP is disabled outside production** so Swagger UI works (it is compatible with the production CSP too, covered by a test).
- **Deployment skipped.** The brief marks it optional.

## AI usage

**Tools.** Claude Code only. The main session ran an Opus model as an orchestrator that planned tasks, reviewed diffs and kept `docs/` current; it did not write feature code. Each task from `docs/TASKS.md` went to an `implementer` sub-agent on Sonnet with a self-contained prompt (acceptance criteria, files, DTO shapes, patterns to follow). Independent tasks (for example the library page alongside the book read endpoints) ran in parallel in separate git worktrees and were merged afterwards; the history has the "Merge ..." commits. `AGENTS.md`, `docs/TASKS.md` and `docs/DECISIONS.md` were the shared memory between sessions.

**What was delegated.** Nearly all code: scaffolding, schema and migrations, seed data, endpoints, tests, frontend pages, Dockerfiles. I owned the stack choices, the roles model, the search design and the trade-offs above, and reviewed each task before it was committed.

**How it was verified.** Every task had to pass lint, typecheck, build and tests before commit. Backend behaviour is covered by integration tests on a real Postgres. UI flows were exercised in a real browser with Playwright runs. The Docker setup was verified by actually running `docker compose up`: images built, services healthy, migrate and seed on first start and on restart, SPA fallback and `/api` proxy through nginx, login, and Swagger (recorded in `docs/DECISIONS.md`).

**Where AI output was corrected, and why** (each is visible in the history or `docs/DECISIONS.md`):

- **Relevance sorting.** The list endpoint needed a way to rank by relevance when searching. The shortcut was a hack in the request itself; I had it replaced by making `sort` optional in the shared schema, so the service picks relevance (with `q`) or title, and an explicit `sort` always wins. The frontend omits `sort` until the user picks one. See commit `4a4d8ff`.
- **`useFieldArray` did not fit.** The natural choice for the repeating author field is `useFieldArray`, but it only holds arrays of objects and `authorNames` is a `string[]` in the shared schema. The form controls the list with `useWatch`/`setValue` instead of reshaping the shared contract to suit the form library.
- **Docker was initially unverifiable.** The Dockerfiles and compose were first written without a run to prove them. I did not accept the task until a real `docker compose up` worked; the result, including the `node:22-slim` choice and the `COOKIE_SECURE` setting for plain http, is in the decisions log.
- **Seed data.** The first seed was written from memory (the sandbox could not reach Open Library) and some ISBNs did not match real editions, so covers were missing. I had it replaced with data fetched from Open Library by a committed script, using cover IDs instead of ISBN lookups, and checked a random sample of covers against the live service.
- **Unrequested major version.** I asked for react-router 7; the agent installed 8 without flagging it. The APIs used are unchanged, so I kept it, but logged it rather than letting the drift pass silently.
- **Lockfile churn.** An early `npm install` in the sandbox rewrote `package-lock.json` for a different npm version (dropping platform `libc` metadata). It was unrelated to the change, so I reverted it before committing.

> **TODO (author):** add your own examples of AI output you rejected or rewrote, and why.
