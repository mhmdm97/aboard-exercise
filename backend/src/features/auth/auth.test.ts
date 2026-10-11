import { eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { buildApp } from '../../app.js'
import { loadEnv } from '../../config/env.js'
import { sessions } from '../../db/schema/index.js'
import { seedUsers } from '../../db/seed-users.js'
import { createTestDb, truncateAll } from '../../test/db.js'

const { db, close } = createTestDb()
let app: FastifyInstance

beforeAll(async () => {
  app = await buildApp({ env: loadEnv(), db })
  // Test-only routes to exercise the guards.
  app.get('/test/admin', { preHandler: app.requireRole('admin') }, async () => ({ ok: true }))
  app.get('/test/auth', { preHandler: app.requireAuth }, async () => ({ ok: true }))
})

afterAll(async () => {
  await app.close()
  await close()
})

beforeEach(() => truncateAll(db))

const post = (url: string, payload?: unknown, cookie?: string) =>
  app.inject({ method: 'POST', url, payload: payload as object, headers: cookie ? { cookie } : {} })

const sidCookie = (res: { cookies: { name: string; value: string }[] }): string => {
  const c = res.cookies.find((x) => x.name === 'sid')
  if (!c) throw new Error('no sid cookie')
  return `sid=${c.value}`
}

const newUser = { email: 'New@Example.com ', name: ' Nia ', password: 'password123' }

describe('POST /api/auth/register', () => {
  it('creates a member, logs in and sets a hardened cookie', async () => {
    const res = await post('/api/auth/register', newUser)
    expect(res.statusCode).toBe(201)
    expect(res.json()).toMatchObject({ email: 'new@example.com', name: 'Nia', role: 'member' })
    expect(res.json()).not.toHaveProperty('passwordHash')
    const cookie = res.cookies.find((c) => c.name === 'sid')
    expect(cookie).toMatchObject({ httpOnly: true, sameSite: 'Lax', path: '/' })
    expect(cookie?.maxAge).toBe(7 * 24 * 60 * 60)

    const me = await app.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie: sidCookie(res) } })
    expect(me.statusCode).toBe(200)
    expect(me.json()).toMatchObject({ email: 'new@example.com', role: 'member' })
  })

  it('returns 409 for a duplicate email', async () => {
    await post('/api/auth/register', newUser)
    const res = await post('/api/auth/register', { ...newUser, email: 'new@example.com' })
    expect(res.statusCode).toBe(409)
    expect(res.json()).toMatchObject({ error: { code: 'CONFLICT' } })
  })

  it('returns 400 for an invalid body', async () => {
    const res = await post('/api/auth/register', { email: 'nope', name: '', password: 'short' })
    expect(res.statusCode).toBe(400)
    expect(res.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } })
  })
})

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await seedUsers(db)
  })

  it('logs in with valid credentials', async () => {
    const res = await post('/api/auth/login', { email: 'Admin@library.local', password: 'Admin123!' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ email: 'admin@library.local', role: 'admin' })
    expect(sidCookie(res)).toMatch(/^sid=.{40,}/)
  })

  it('returns 401 for a wrong password', async () => {
    const res = await post('/api/auth/login', { email: 'admin@library.local', password: 'wrong' })
    expect(res.statusCode).toBe(401)
    expect(res.json()).toMatchObject({ error: { code: 'INVALID_CREDENTIALS' } })
  })

  it('returns the same 401 for an unknown email', async () => {
    const res = await post('/api/auth/login', { email: 'ghost@library.local', password: 'whatever1' })
    expect(res.statusCode).toBe(401)
    expect(res.json()).toMatchObject({ error: { code: 'INVALID_CREDENTIALS' } })
  })

  it('rejects form-urlencoded bodies with 415', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: 'email=admin@library.local&password=Admin123!',
    })
    expect(res.statusCode).toBe(415)
  })
})

describe('logout and sessions', () => {
  it('logout deletes the session; /me is then 401; logout is idempotent', async () => {
    const reg = await post('/api/auth/register', newUser)
    const cookie = sidCookie(reg)
    const out = await post('/api/auth/logout', undefined, cookie)
    expect(out.statusCode).toBe(204)
    expect(await db.select().from(sessions)).toHaveLength(0)
    const me = await app.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie } })
    expect(me.statusCode).toBe(401)
    expect((await post('/api/auth/logout')).statusCode).toBe(204)
  })

  it('rejects and deletes an expired session', async () => {
    const reg = await post('/api/auth/register', newUser)
    await db.update(sessions).set({ expiresAt: new Date(Date.now() - 1000) })
    const me = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie: sidCookie(reg) },
    })
    expect(me.statusCode).toBe(401)
    expect(await db.select().from(sessions).where(eq(sessions.userId, reg.json().id))).toHaveLength(0)
  })

  it('GET /me is 401 when anonymous', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auth/me' })
    expect(res.statusCode).toBe(401)
    expect(res.json()).toMatchObject({ error: { code: 'UNAUTHORIZED' } })
  })
})

describe('requireRole guard', () => {
  it('401 anonymous, 403 member, 200 admin', async () => {
    await seedUsers(db)
    const login = (email: string, password: string) => post('/api/auth/login', { email, password })
    const member = sidCookie(await login('member@library.local', 'Member123!'))
    const admin = sidCookie(await login('admin@library.local', 'Admin123!'))
    const get = (cookie?: string) =>
      app.inject({ method: 'GET', url: '/test/admin', headers: cookie ? { cookie } : {} })

    expect((await get()).statusCode).toBe(401)
    const forbidden = await get(member)
    expect(forbidden.statusCode).toBe(403)
    expect(forbidden.json()).toMatchObject({ error: { code: 'FORBIDDEN' } })
    expect((await get(admin)).statusCode).toBe(200)
  })
})
