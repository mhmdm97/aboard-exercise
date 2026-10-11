import { sql } from 'drizzle-orm'
import type { HealthResponse } from '@library/shared'
import type { Database } from '../../db/client.js'

/** Returns the health payload, or null when the database is unreachable. */
export async function checkHealth(db: Database): Promise<HealthResponse | null> {
  try {
    await db.execute(sql`select 1`)
    return { status: 'ok', timestamp: new Date().toISOString() }
  } catch {
    return null
  }
}
