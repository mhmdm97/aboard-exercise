import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { sql } from 'drizzle-orm'
import * as schema from '../db/schema/index.js'
import type { Database } from '../db/client.js'

export function createTestDb(): { db: Database; close: () => Promise<void> } {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  return { db: drizzle(pool, { schema }), close: () => pool.end() }
}

/** Empties every table (call in beforeEach/afterEach of tests that write data). */
export async function truncateAll(db: Database): Promise<void> {
  await db.execute(
    sql`TRUNCATE TABLE favourites, book_genres, book_authors, books, genres, authors, sessions, users RESTART IDENTITY CASCADE`,
  )
}
