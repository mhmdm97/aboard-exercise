import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import pg from 'pg'
import { loadEnv } from '../config/env.js'

// Standalone so it can run from built JS (dist/db/migrate.js) in Docker.
const pool = new pg.Pool({ connectionString: loadEnv().DATABASE_URL })
try {
  await migrate(drizzle(pool), { migrationsFolder: './drizzle' })
  console.log('Migrations applied')
} finally {
  await pool.end()
}
