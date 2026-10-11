import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Forward API calls to the backend API (dev server and `vite preview`)
const proxy = { '/api': 'http://localhost:5000' }

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
