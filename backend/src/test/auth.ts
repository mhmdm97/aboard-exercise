import type { FastifyInstance } from 'fastify'
import type { Database } from '../db/client.js'
import { seedUsers } from '../db/seed-users.js'

const credentials = {
  admin: { email: 'admin@library.local', password: 'Admin123!' },
  member: { email: 'member@library.local', password: 'Member123!' },
} as const

/** Seeds the demo users (idempotent), logs in as `role` and returns the cookie header value. */
export async function loginAs(app: FastifyInstance, db: Database, role: keyof typeof credentials): Promise<string> {
  await seedUsers(db)
  const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: credentials[role] })
  const sid = res.cookies.find((c) => c.name === 'sid')
  if (!sid) throw new Error(`login as ${role} failed: ${res.statusCode}`)
  return `sid=${sid.value}`
}
