import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { BookDto } from '@library/shared'
import { buildApp } from '../../app.js'
import { loadEnv } from '../../config/env.js'
import { genres } from '../../db/schema/index.js'
import { loginAs } from '../../test/auth.js'
import { createTestDb, truncateAll } from '../../test/db.js'

const { db, close } = createTestDb()
let app: FastifyInstance
let admin: string
let member: string
let a: BookDto
let b: BookDto

beforeAll(async () => {
  app = await buildApp({ env: loadEnv(), db })
})
afterAll(async () => {
  await truncateAll(db)
  await app.close()
  await close()
})
beforeEach(async () => {
  await truncateAll(db)
  await db.insert(genres).values({ name: 'Fantasy', slug: 'fantasy' })
  admin = await loginAs(app, db, 'admin')
  member = await loginAs(app, db, 'member')
  const mk = async (title: string) =>
    (await app.inject({ method: 'POST', url: '/api/books', headers: { cookie: admin }, payload: { title, authorNames: ['X'], genreSlugs: ['fantasy'] } })).json<BookDto>()
  a = await mk('Book A')
  b = await mk('Book B')
})

const send = (method: 'GET' | 'PUT' | 'DELETE', url: string, cookie?: string) =>
  app.inject({ method, url, headers: cookie ? { cookie } : {} })

describe('favourites', () => {
  it('adds idempotently and lists ids', async () => {
    expect((await send('PUT', `/api/books/${a.id}/favourite`, member)).statusCode).toBe(204)
    expect((await send('PUT', `/api/books/${a.id}/favourite`, member)).statusCode).toBe(204)
    const ids = await send('GET', '/api/me/favourites/ids', member)
    expect(ids.statusCode).toBe(200)
    expect(ids.json()).toEqual([a.id])
    // Favourites are per user.
    expect((await send('GET', '/api/me/favourites/ids', admin)).json()).toEqual([])
  })

  it('lists books, most recently favourited first', async () => {
    await send('PUT', `/api/books/${a.id}/favourite`, member)
    await send('PUT', `/api/books/${b.id}/favourite`, member)
    const res = await send('GET', '/api/me/favourites', member)
    expect(res.statusCode).toBe(200)
    const list = res.json<BookDto[]>()
    expect(list.map((x) => x.title)).toEqual(['Book B', 'Book A'])
    expect(list[0]?.authors[0]?.name).toBe('X')
  })

  it('removes idempotently', async () => {
    await send('PUT', `/api/books/${a.id}/favourite`, member)
    expect((await send('DELETE', `/api/books/${a.id}/favourite`, member)).statusCode).toBe(204)
    expect((await send('DELETE', `/api/books/${a.id}/favourite`, member)).statusCode).toBe(204)
    expect((await send('GET', '/api/me/favourites', member)).json()).toEqual([])
  })

  it('returns 404 for an unknown book', async () => {
    const res = await send('PUT', '/api/books/00000000-0000-4000-8000-000000000000/favourite', member)
    expect(res.statusCode).toBe(404)
  })

  it('returns 401 when anonymous', async () => {
    for (const [m, url] of [
      ['PUT', `/api/books/${a.id}/favourite`],
      ['DELETE', `/api/books/${a.id}/favourite`],
      ['GET', '/api/me/favourites'],
      ['GET', '/api/me/favourites/ids'],
    ] as const) {
      expect((await send(m, url)).statusCode).toBe(401)
    }
  })
})
