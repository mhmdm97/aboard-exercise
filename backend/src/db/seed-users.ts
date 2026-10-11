import { hash } from '@node-rs/argon2'
import type { Database } from './client.js'
import { users } from './schema/index.js'

// Demo credentials, documented in the README; not secrets.
const demoUsers = [
  { email: 'admin@library.local', name: 'Ada Admin', password: 'Admin123!', role: 'admin' },
  { email: 'member@library.local', name: 'Max Member', password: 'Member123!', role: 'member' },
] as const

/** Idempotent: re-running resets the demo users' name, role and password. */
export async function seedUsers(db: Database): Promise<{ users: number }> {
  for (const { password, ...u } of demoUsers) {
    const passwordHash = await hash(password)
    await db
      .insert(users)
      .values({ ...u, passwordHash })
      .onConflictDoUpdate({
        target: users.email,
        set: { name: u.name, role: u.role, passwordHash, updatedAt: new Date() },
      })
  }
  return { users: demoUsers.length }
}
