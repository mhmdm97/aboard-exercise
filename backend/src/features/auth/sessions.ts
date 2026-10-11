import { createHash, randomBytes } from 'node:crypto'
import { eq, lt } from 'drizzle-orm'
import type { UserDto } from '@library/shared'
import type { Database } from '../../db/client.js'
import { sessions, users } from '../../db/schema/index.js'

export const SESSION_COOKIE = 'sid'

const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex')

/** Creates a session and returns the opaque token (only its SHA-256 is stored). */
export async function createSession(db: Database, userId: string, ttlDays: number): Promise<string> {
  // Opportunistic cleanup of expired sessions (nothing else would ever remove abandoned ones).
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()))
  const token = randomBytes(32).toString('base64url')
  await db.insert(sessions).values({
    id: hashToken(token),
    userId,
    expiresAt: new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000),
  })
  return token
}

/** Returns the session's user, or null if unknown/expired (expired rows are deleted lazily). */
export async function resolveSession(db: Database, token: string): Promise<UserDto | null> {
  const id = hashToken(token)
  const [row] = await db
    .select({
      expiresAt: sessions.expiresAt,
      user: { id: users.id, email: users.email, name: users.name, role: users.role },
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.id, id))
  if (!row) return null
  if (row.expiresAt.getTime() <= Date.now()) {
    await db.delete(sessions).where(eq(sessions.id, id))
    return null
  }
  return row.user
}

export async function deleteSession(db: Database, token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, hashToken(token)))
}
