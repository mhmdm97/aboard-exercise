# AGENTS.md

Instructions for any AI coding agent working in this repo (Claude Code, Antigravity, Gemini, Codex, …).
**Read this file fully before doing anything. Then read `docs/EXERCISE.md` and `docs/TASKS.md`.**

## Context

- This is a **timed take-home exercise** for a recruitment process with Abroad. Hard deadline: **20:00 on the exercise day**.
- AI-assisted development is expected. Several agents may work on this repo one after another
  (e.g. Claude Code first, Antigravity later). **The repo files are the only shared memory**: anything not
  written to `docs/` or committed does not exist for the next agent.
- Priorities, in order: **(1) working, complete features covering the brief → (2) clean, readable code → (3) tests → (4) polish.**
  A finished, simple solution beats an unfinished, elaborate one.

## Handoff protocol (mandatory)

1. **Start of session:** read `docs/EXERCISE.md` (the brief), `docs/TASKS.md` (the plan + status),
   `docs/DECISIONS.md` (decisions made so far) and run `git log --oneline -15`.
2. **Pick the first task in `docs/TASKS.md` marked `[ ]`** (or resume a `[~]` task, checking its notes). Mark it `[~]` before starting.
3. **Keep tasks small** (≤ ~30 min of work). If a task is too big, split it in `docs/TASKS.md` first.
4. **After each task:** build + test (see Commands), mark it `[x]`, add a one-line note if anything is
   non-obvious, then **commit** (see Git). Never leave the repo in a non-building state between tasks.
5. Record any architectural/product decision or assumption about the brief in `docs/DECISIONS.md` (one line each).
6. If you're about to run out of budget/context, stop at a clean point, update `docs/TASKS.md` with what's
   left and what's half-done (`[~]` + note), and commit. A short "Next up" note at the top of TASKS.md helps.

## Repo layout

```
AGENTS.md                 ← you are here (CLAUDE.md / GEMINI.md just point here)
docs/EXERCISE.md          ← the exercise brief, verbatim
docs/TASKS.md             ← task board / progress log
docs/DECISIONS.md         ← decisions & assumptions log
backend/                  ← Node + TypeScript API (not created yet, see TASKS.md §1)
frontend/                 ← React 19 + TypeScript + Vite
.github/workflows/ci.yml  ← CI: npm lint + build (add backend job when backend exists)
```

The original .NET boilerplate was removed: the brief requires a **Node** API.

## Commands

Run from the repo root.

| What | Command |
| --- | --- |
| Frontend install | `npm install --prefix frontend` |
| Frontend dev (http://localhost:5173) | `npm run dev --prefix frontend` |
| Frontend checks | `npm run lint --prefix frontend` and `npm run build --prefix frontend` |
| Backend | _TBD once the Node stack is scaffolded (TASKS.md §1); update this table then_ |

`dev` servers are long-running: start them in the background or in a separate terminal, never block on them.
**Definition of done for any task:** backend tests pass, frontend lint + build pass, the feature works when run.

## Backend conventions (Node + TypeScript)

_To be written by the agent that scaffolds the backend (TASKS.md §1), once the stack is chosen and logged in DECISIONS.md._
Until then: TypeScript strict, feature folders (`src/features/<feature>/` with routes, service, schemas, tests),
thin route handlers with logic in services, validation at the edge, async all the way, no secrets in the repo.
The API listens on port 5000 (the Vite proxy forwards `/api` there).

## Frontend conventions (React 19, TS, Vite)

- Function components + hooks only. TypeScript strict; no `any`.
- Structure:
  - `src/api/client.ts`: the fetch wrapper (`apiGet` etc.). Add `apiPost/apiPut/apiDelete` there; one typed function per endpoint.
  - `src/features/<feature>/`: components, hooks and types for that feature.
  - `src/components/`: shared UI pieces.
- API calls use relative URLs (`/api/...`); Vite proxies `/api` to `http://localhost:5000` in dev. Never hardcode the backend host.
- State: local state + custom hooks first. Add **TanStack Query** for server state and **react-router** for multiple pages only when needed (log it in DECISIONS.md).
- Styling: plain CSS (or CSS modules) is fine. Don't pull in a UI framework unless it clearly saves time for the brief.
- Handle the loading / error / empty states for every data fetch.
- Keep DTO types in sync with the backend records by hand (same field names, camelCase).

## Testing

- Backend: every endpoint gets at least one integration test (happy path plus the main error case). Unit-test non-trivial service logic.
- Frontend: no test runner is installed yet. If time allows, add Vitest + React Testing Library for key components; this is lower priority than features.

## Git

- Single branch `main`, remote `origin` = github.com/mhmdm97/abroad-exercise (**public repo**: never commit secrets).
- Commit after every completed task, with a small, focused commit. Message: imperative summary line, e.g. `Add order creation endpoint`.
- Run build + tests before committing. Don't commit `bin/`, `obj/`, `node_modules/`, `dist/` (already in `.gitignore`).
- Push regularly (at least every few tasks) so work is never only local.
- Never rewrite history (`--force`, `rebase` of pushed commits, `reset --hard`) without the user asking.

## Don'ts

- Don't upgrade framework/package major versions or swap the stack.
- Don't restructure working code "for cleanliness" while features are still missing.
- Don't add dependencies without a reason; note non-obvious ones in DECISIONS.md.
- Don't silently guess on ambiguous requirements: pick the simplest reasonable interpretation, **log it in DECISIONS.md**, and move on (don't block).
- Don't delete or rewrite `docs/` history; append and update statuses.

## Before the deadline

Reserve the last ~45 minutes for:
1. Running everything from a clean clone. Check that the README run instructions actually work.
2. Updating `README.md`: what was built, how to run it, assumptions (from DECISIONS.md), what you'd do with more time.
3. A final commit and push. Check CI is green: `gh run list --limit 1`.
