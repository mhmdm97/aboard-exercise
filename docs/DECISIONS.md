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
