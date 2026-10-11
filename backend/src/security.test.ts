import { eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { buildApp } from './app.js'
import { loadEnv } from './config/env.js'
import { sessions, users } from './db/schema/index.js'
import { createTestDb, truncateAll } from './test/db.js'
import { loginAs } from './test/auth.js'

const { db, close } = createTestDb()
let app: FastifyInstance

beforeAll(async () => {
  app = await buildApp({ env: loadEnv(), db })
  app.get('/test/boom', async () => {
    throw new Error('secret internal detail')
  })
})
afterAll(async () => {
  await app.close()
  await close()
})
beforeEach(() => truncateAll(db))

const bookBody = { title: 'T', authorNames: ['A'] }

describe('input hardening', () => {
  it('rejects non-http(s) cover URLs', async () => {
    const cookie = await loginAs(app, db, 'admin')
    for (const coverUrl of ['javascript:alert(1)', 'data:text/html,<script>1</script>', 'ftp://x.test/a.jpg']) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/books',
        headers: { cookie },
        payload: { ...bookBody, coverUrl },
      })
      expect(res.statusCode).toBe(400)
    }
    const ok = await app.inject({
      method: 'POST',
      url: '/api/books',
      headers: { cookie },
      payload: { ...bookBody, coverUrl: 'https://example.com/c.jpg' },
    })
    expect(ok.statusCode).toBe(201)
  })

  it('ignores a role sent to register (no mass assignment)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'x@y.test', name: 'X', password: 'password123', role: 'admin' },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().role).toBe('member')
    const [row] = await db.select().from(users).where(eq(users.email, 'x@y.test'))
    expect(row?.role).toBe('member')
  })

  it('does not leak error details on 500', async () => {
    const res = await app.inject({ method: 'GET', url: '/test/boom' })
    expect(res.statusCode).toBe(500)
    expect(res.body).not.toContain('secret internal detail')
    expect(res.body).not.toContain('at ')
  })
})

describe('CSRF', () => {
  it('rejects unsafe requests from a foreign Origin, even without a body', async () => {
    const cookie = await loginAs(app, db, 'member')
    const evil = { cookie, origin: 'https://evil.example' }
    for (const [method, url] of [
      ['POST', '/api/auth/logout'],
      ['PUT', '/api/books/00000000-0000-4000-8000-000000000000/favourite'],
      ['DELETE', '/api/books/00000000-0000-4000-8000-000000000000/favourite'],
    ] as const) {
      const res = await app.inject({ method, url, headers: evil })
      expect(res.statusCode, `${method} ${url}`).toBe(403)
    }
    expect((await app.inject({ method: 'GET', url: '/api/auth/me', headers: evil })).statusCode).toBe(200)
  })

  it('allows same-origin and Origin-less requests', async () => {
    const same = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { origin: 'http://localhost:8080', host: 'localhost:8080' },
    })
    expect(same.statusCode).toBe(204)
    expect((await app.inject({ method: 'POST', url: '/api/auth/logout' })).statusCode).toBe(204)
  })
})

describe('sessions', () => {
  it('login issues a fresh token and purges expired sessions', async () => {
    const first = await loginAs(app, db, 'member')
    const [member] = await db.select().from(users).where(eq(users.email, 'member@library.local'))
    await db.insert(sessions).values({ id: 'stale', userId: member!.id, expiresAt: new Date(Date.now() - 1000) })
    const second = await loginAs(app, db, 'member')
    expect(second).not.toBe(first)
    const rows = await db.select().from(sessions)
    expect(rows.map((r) => r.id)).not.toContain('stale')
    expect(rows).toHaveLength(2)
  })
})

describe('production hardening', () => {
  it('rate limits login and serves docs under the helmet CSP', async () => {
    const prod = await buildApp({ env: { ...loadEnv(), NODE_ENV: 'production' }, db })
    try {
      const login = () =>
        prod.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'a@b.test', password: 'wrong-pass' } })
      const codes: number[] = []
      for (let i = 0; i < 12; i++) codes.push((await login()).statusCode)
      expect(codes.slice(0, 10).every((c) => c === 401)).toBe(true)
      expect(codes[10]).toBe(429)

      const docs = await prod.inject({ method: 'GET', url: '/api/docs/' })
      expect(docs.statusCode).toBe(200)
      expect(docs.headers['content-security-policy']).toContain("script-src 'self'")
      expect(docs.body).not.toMatch(/<script>/) // no inline scripts, so the CSP does not break Swagger UI
    } finally {
      await prod.close()
    }
  })
})
