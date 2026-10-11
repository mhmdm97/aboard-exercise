import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { DATABASE_URL } from './env.ts'

const backendDir = fileURLToPath(new URL('../backend', import.meta.url))

async function ensureDatabase() {
  const name = decodeURIComponent(new URL(DATABASE_URL).pathname.slice(1))
  const admin = new URL(DATABASE_URL)
  admin.pathname = '/postgres'
  const client = new pg.Client({ connectionString: admin.toString() })
  await client.connect()
  try {
    const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name])
    if (!rowCount) await client.query(`CREATE DATABASE "${name.replaceAll('"', '""')}"`)
  } finally {
    await client.end()
  }
}

function runBackendScript(script: string) {
  const result = spawnSync(process.execPath, [script], {
    cwd: backendDir, // the migrator resolves ./drizzle relative to the backend package
    env: { ...process.env, DATABASE_URL },
    stdio: 'inherit',
  })
  if (result.status !== 0) throw new Error(`${script} failed (exit ${result.status}). Did you run \`npm run build\`?`)
}

// Creates the e2e database if missing, then migrates and seeds it (all idempotent) from the built backend.
// Run as part of the backend's webServer command: Playwright starts web servers before any globalSetup.
await ensureDatabase()
runBackendScript('dist/db/migrate.js')
runBackendScript('dist/db/seed.js')
