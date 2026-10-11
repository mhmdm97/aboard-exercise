import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Forward API calls to the backend API (dev server and `vite preview`).
// changeOrigin must stay false: the backend's CSRF check compares the browser's Origin header to Host,
// and rewriting Host to localhost:5000 would make every login/POST from localhost:5173 a 403.
const proxy = { '/api': { target: process.env.API_PROXY_TARGET ?? 'http://localhost:5000', changeOrigin: false } }

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
  server: {
    port: 5173,
    proxy,
  },
  preview: { proxy },
})
