# Task board

Status: `[ ]` todo · `[~]` in progress (add a note) · `[x]` done · `[-]` dropped (say why)
Keep tasks small (≤ ~30 min). Update this file and commit after every task. See AGENTS.md → Handoff protocol.
Brief: `docs/EXERCISE.md`. Tags: **(R)** = required by the brief, **(S)** = suggested/optional.

## Next up
_One or two lines for the next agent: what to do next, anything half-done._
.NET boilerplate removed. Next: make the decisions in §0, then scaffold the backend (§1).

## 0. Setup & decisions
- [x] Repo, React/Vite skeleton, CI (frontend)
- [x] Remove .NET boilerplate (brief requires a Node API)
- [x] Paste brief into `docs/EXERCISE.md`
- [ ] Reply-all to the email confirming receipt (user, not an agent)
- [ ] Decide: books or movies (domain model: title, cover, author/director, genres, year, rating, description…)
- [ ] Decide backend stack: framework, DB + ORM, auth approach, test runner (log each in docs/DECISIONS.md)
- [ ] Decide roles and what each can do (e.g. `admin` = full CRUD, `user` = read-only + maybe favourites/reviews)

## 1. Backend (Node + TypeScript) (R)
- [ ] Scaffold `backend/`: TS strict, lint, test runner, `npm run dev/build/test`, health endpoint, config via env
- [ ] DB schema + migrations: users, items (books/movies), people (authors/directors), genres, item↔genre
- [ ] Seed script: ≥ 200 items with covers, creators, genres + demo users per role (R)
- [ ] Auth: register, login, logout/me; password hashing; session or JWT (R)
- [ ] Role-based authorization middleware; protect write endpoints (R)
- [ ] Items: list endpoint with pagination (R)
- [ ] Items: search (title / creator) (R)
- [ ] Items: filtering (genre, year range, rating…) + sorting (R)
- [ ] Items: get by id
- [ ] Items: create / update / delete with request validation (R)
- [ ] Genres / creators lookup endpoints (for filters and form dropdowns)
- [ ] Consistent error format (validation 400, 401, 403, 404)
- [ ] Integration tests for every endpoint: happy path + main error case, incl. role checks (R)
- [ ] API documentation: OpenAPI spec + Swagger UI (S)

## 2. Frontend (React + TypeScript) (R)
- [ ] App shell: routing, layout, nav, server-state library, API client with auth
- [ ] Auth pages: login, register; auth context; logout; protected routes
- [ ] Library page: grid/list of items with covers, loading / error / empty states
- [ ] Search box (debounced) wired to API (R)
- [ ] Filter panel (genre, year, rating, sort); state kept in URL query params (R)
- [ ] Pagination or infinite scroll (S: infinite scroll)
- [ ] Item detail page
- [ ] Create / edit form with client-side validation (admin only) (R)
- [ ] Delete with confirmation (admin only) (R)
- [ ] Role-aware UI: hide/disable actions the user can't perform (R)
- [ ] Responsive design: mobile, tablet, desktop (R)
- [ ] Accessibility pass: labels, focus states, keyboard nav, alt text, contrast (S)
- [ ] UI polish / animation (S)
- [ ] Frontend tests: Vitest + React Testing Library for key components/hooks (R)

## 3. Docker & CI (R)
- [ ] Backend Dockerfile (multi-stage)
- [ ] Frontend Dockerfile (build, then serve static files via nginx, proxying `/api`)
- [ ] `docker-compose.yml`: db + backend + frontend; migrate + seed on start; `.env.example`
- [ ] CI: add backend job (lint, build, test); frontend tests job
- [ ] Deployment (S, only if time allows)

## 4. Deliverables & wrap-up (reserve the last ~45 min)
- [ ] Root `DECISIONS.md` with exactly two sections: "Architecture & trade-offs" and "AI usage" (R). Source: docs/DECISIONS.md log + notes
- [ ] README: overview, setup + run (Docker and local), demo credentials, tests, how it was built (R)
- [ ] Note for the submission email: frontend vs backend focus and why
- [ ] Clean-clone run-through using only the README (`docker compose up`)
- [ ] Final commit + push, CI green
