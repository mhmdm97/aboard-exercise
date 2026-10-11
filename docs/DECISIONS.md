# Decisions & assumptions

One line per entry, newest at the bottom. Format: `- [area] decision: reason`.

- [stack] .NET 10 minimal API + React 19/TS/Vite monorepo: chosen ahead of time for the exercise.
- [backend] Feature-folder minimal APIs, no extra layered projects: keeps the code small and readable under time pressure.
- [frontend] Vite dev proxy for `/api` → backend:5000 instead of relying on CORS (a CORS policy also exists for direct calls).
- [stack] Removed the .NET boilerplate: the brief requires a Node API (supersedes the .NET entries above).
