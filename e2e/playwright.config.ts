import { defineConfig, devices } from '@playwright/test'
import { BACKEND_PORT, BASE_URL, DATABASE_URL, FRONTEND_PORT } from './env.ts'

// Production-like path: the built backend behind the built frontend served by `vite preview`,
// whose /api proxy is the same one the dev server uses (so Origin/Host handling is exercised for real).
// Run `npm run build` first.
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1, // specs share one database
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    contextOptions: { reducedMotion: 'reduce' },
    // Local runs only: point at a preinstalled Chromium when the bundled build is not available.
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'tsx e2e/setup-db.ts && node backend/dist/server.js',
      cwd: '..',
      url: `http://127.0.0.1:${BACKEND_PORT}/api/health`,
      reuseExistingServer: false,
      env: {
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        PORT: String(BACKEND_PORT),
        DATABASE_URL,
        SESSION_SECRET: 'e2e-session-secret',
        COOKIE_SECRET: 'e2e-cookie-secret',
        COOKIE_SECURE: 'false', // plain http
      },
    },
    {
      command: `npm exec -w abroad-frontend -- vite preview --port ${FRONTEND_PORT} --strictPort`,
      cwd: '..',
      url: BASE_URL,
      reuseExistingServer: false,
      env: { API_PROXY_TARGET: `http://127.0.0.1:${BACKEND_PORT}` },
    },
  ],
})
