import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { loadEnv } from '../config/env.js'
import * as schema from './schema/index.js'

const pool = new pg.Pool({ connectionString: loadEnv().DATABASE_URL })

export const db = drizzle(pool, { schema })
export type Database = typeof db

export async function closeDb(): Promise<void> {
  await pool.end()
}
