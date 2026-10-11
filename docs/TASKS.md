# Task board

Status: `[ ]` todo · `[~]` in progress (add a note) · `[x]` done · `[-]` dropped (say why)
Keep tasks small (≤ ~30 min). Update this file and commit after every task. See AGENTS.md → Handoff protocol.
Brief: `docs/EXERCISE.md`. Tags: **(R)** = required by the brief, **(S)** = suggested/optional.

## Next up
_One or two lines for the next agent: what to do next, anything half-done._
Backend: scaffold, schema, seed, auth/roles and book read endpoints done. Books write endpoints and favourites done. Next: frontend auth pages, detail page, forms; Docker.

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
- [ ] UI polish / animation (S)
- [x] Frontend tests: Vitest + React Testing Library for key components/hooks (R)

## 3. Docker & CI (R)
- [x] Backend Dockerfile (multi-stage)
- [x] Frontend Dockerfile (build, then serve static files via nginx, proxying `/api`)
- [x] `docker-compose.yml`: db + backend + frontend; migrate + seed on start; `.env.example`
- [x] CI: add backend job (lint, build, test); frontend tests job
- [ ] Deployment (S, only if time allows)

## 4. Deliverables & wrap-up (reserve the last ~45 min)
- [ ] Root `DECISIONS.md` with exactly two sections: "Architecture & trade-offs" and "AI usage" (R). Source: docs/DECISIONS.md log + notes
- [ ] README: overview, setup + run (Docker and local), demo credentials, tests, how it was built (R)
- [ ] Note for the submission email: frontend vs backend focus and why
- [ ] Clean-clone run-through using only the README (`docker compose up`)
- [ ] Final commit + push, CI green
