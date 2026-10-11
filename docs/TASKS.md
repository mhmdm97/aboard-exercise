# Task board

Status: `[ ]` todo · `[~]` in progress (add a note) · `[x]` done · `[-]` dropped (say why)
Keep tasks small (≤ ~30 min). Update this file and commit after every task. See AGENTS.md → Handoff protocol.
Brief: `docs/EXERCISE.md`. Tags: **(R)** = required by the brief, **(S)** = suggested/optional.

## Next up
_Everything is built and verified (full Docker stack re-checked with zero CSP violations, backend tests stable over 5 runs, README and root DECISIONS refreshed). Left for the author:_
- Write the `## AI usage` section of root `DECISIONS.md` from `docs/AI-USAGE-NOTES.md` (replace the TODO block), then delete `docs/AI-USAGE-NOTES.md`.
- Done: the hand-written seed was replaced with real Open Library data (see section 5).
- Write the submission email: frontend vs backend focus and why. Reply-all confirming receipt.
- Final push and check CI is green (`gh run list --limit 1`).

## 0. Setup & decisions
- [x] Repo, React/Vite skeleton, CI (frontend)
- [x] Remove .NET boilerplate (brief requires a Node API)
- [x] Paste brief into `docs/EXERCISE.md`
- [ ] Reply-all to the email confirming receipt (user, not an agent)
- [x] Decide: books (title, cover, authors, genres, year, rating, description, ISBN, pages)
- [x] Decide stack: npm workspaces, Fastify + Zod, Postgres + Drizzle, cookie sessions, Vitest
- [x] Decide roles: `admin` = full CRUD, `member` = browse + favourites

## 1. Backend (Node + TypeScript) (R)
- [x] Scaffold npm workspaces (`frontend`, `backend`, `shared`) + `backend/` (Fastify, TS strict, lint, Vitest, health, env config, Swagger) + dev Postgres in docker-compose + CI backend job
- [x] DB schema + migrations: users, items (books), authors, genres, book↔genre, book↔author, favourites
- [x] Seed script: ≥ 200 books with covers, creators, genres (R). Demo users added in the auth task (`seed-users.ts`)
- [x] Auth: register, login, logout/me; password hashing; session or JWT (R)
- [x] Role-based authorization middleware; protect write endpoints (R)
- [x] Books: list endpoint with pagination (R)
- [x] Books: search (title / author) (R)
- [x] Books: filtering (genre, year range, rating…) + sorting (R)
- [x] Books: get by id
- [x] Books: create / update / delete with request validation (R)
- [x] Genres / authors lookup endpoints (for filters and form dropdowns)
- [x] Consistent error format (validation 400, 401, 403, 404)
- [x] Favourites: add / remove / list mine (member)
- [x] Integration tests for every endpoint: happy path + main error case, incl. role checks (R)
- [x] API documentation: OpenAPI spec + Swagger UI (S) (`/api/docs`, all 16 routes tagged and summarised)

## 2. Frontend (React + TypeScript) (R)
- [x] App shell: routing, layout, nav, server-state library, API client with auth
- [x] Auth pages: login, register; auth context; logout; protected routes
- [x] Library page: grid/list of books with covers, loading / error / empty states
- [x] Search box (debounced) wired to API (R)
- [x] Filter panel (genre, year, rating, sort); state kept in URL query params (R)
- [x] Pagination or infinite scroll (S: infinite scroll)
- [x] Item detail page (favourites heart + /favourites page included)
- [x] Create / edit form with client-side validation (admin only) (R)
- [x] Delete with confirmation (admin only) (R)
- [x] Role-aware UI: hide/disable actions the user can't perform (R)
- [x] Responsive design: mobile, tablet, desktop (R)
- [x] Accessibility pass: labels, focus states, keyboard nav, alt text, contrast (S) (axe clean on /, detail, login, register, /books/new, /favourites in light + dark; per-route titles; reduced motion)
- [x] UI polish / animation (S) (theme toggle, back/forward view transitions via React Router, empty-state illustration)
- [x] Frontend tests: Vitest + React Testing Library for key components/hooks (R)

## 3. Docker & CI (R)
- [x] Backend Dockerfile (multi-stage)
- [x] Frontend Dockerfile (build, then serve static files via nginx, proxying `/api`)
- [x] `docker-compose.yml`: db + backend + frontend; migrate + seed on start; `.env.example`
- [x] CI: add backend job (lint, build, test); frontend tests job
- [-] Deployment (S): dropped by the author; runs locally via `docker compose up --build`

## 4. Deliverables & wrap-up (reserve the last ~45 min)
- [x] Root `DECISIONS.md` with exactly two sections: "Architecture & trade-offs" and "AI usage" (R). Source: docs/DECISIONS.md log + notes (draft; author to review, TODO block to fill)
- [x] README: overview, setup + run (Docker and local), demo credentials, tests, how it was built (R) (draft; author to review)
- [ ] Note for the submission email: frontend vs backend focus and why
- [x] Clean-clone run-through using only the README (`docker compose up`). Local path verified from a fresh clone (npm ci, db:reset, dev, login via :5173 proxy, lint/typecheck/build/test all green: 17+53+46 tests); Docker path checked via `docker compose config` (ports, env vars, credentials match README); no README/DECISIONS inaccuracies found
- [ ] Final commit + push, CI green

## 5. "Shelf" visual redesign (spec in DECISIONS.md `[design]`)
- [x] Part 1: tokens + self-hosted fonts, shared primitives (`components/ui/ui.css`), header, generated cloth covers, book card, Library page (search, sidebar, mobile drawer, active chips, grid, load more, skeletons, states) and their motion
- [x] Part 2: Detail, BookForm, Auth, States, MobileScreens pages + View Transitions (card to detail cover, route cross-fade, results re-flow); restyle `ConfirmDialog` and the success toast; migrate remaining legacy token names (`--color-*`, `--space-*`) to the new ones

- [x] Replace the hand-written seed with real Open Library data: `backend/scripts/fetch-seed-books.ts` (`npm run seed:fetch -w @library/backend`), 383 books, real ratings and cover IDs; `SeedBook` is explicit and `subtitle` is stored
- [x] Self-host the 383 seed covers (`seed:covers`, `/covers/` nginx location, schema accepts local paths, reseed updates old URLs, docs)
