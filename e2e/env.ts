// Shared by the Playwright config and the global setup. Ports differ from the dev setup (5000/5173)
// so the suite never collides with a running `npm run dev`; override them from the environment if needed.
export const BACKEND_PORT = Number(process.env.E2E_BACKEND_PORT ?? 5100)
export const FRONTEND_PORT = Number(process.env.E2E_FRONTEND_PORT ?? 5174)
export const BASE_URL = `http://localhost:${FRONTEND_PORT}`
export const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://library:library@localhost:5432/library_e2e'
