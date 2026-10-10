# Abroad Exercise

Monorepo with a .NET 10 Web API backend and a React + TypeScript (Vite) frontend.

```
backend/   .NET 10 minimal API (Abroad.slnx)
  src/Abroad.Api           API project
  tests/Abroad.Api.Tests   xUnit + WebApplicationFactory integration tests
frontend/  React 19 + TypeScript + Vite
```

## Prerequisites

- .NET SDK 10.0.x (pinned via `global.json`)
- Node.js 20.19+ / 22.12+ (developed on Node 24)

## Running locally

Backend (http://localhost:5000, OpenAPI document at `/openapi/v1.json`):

```bash
cd backend
dotnet run --project src/Abroad.Api
```

Frontend (http://localhost:5173, proxies `/api/*` to the backend):

```bash
cd frontend
npm install
npm run dev
```

## Tests & checks

```bash
cd backend && dotnet test
cd frontend && npm run lint && npm run build
```

## Notes

- API routes live under the `/api` route group in `backend/src/Abroad.Api/Program.cs`.
- In dev the frontend calls the API through the Vite proxy, so no CORS setup is needed. A CORS policy for
  `http://localhost:5173` is also configured (`Cors:AllowedOrigins`) for direct calls.
- Set `VITE_API_BASE_URL` to point the frontend at a different API host.
