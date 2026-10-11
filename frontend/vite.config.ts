import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

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
    proxy: {
      // Forward API calls to the backend API
      '/api': 'http://localhost:5000',
    },
  },
})
