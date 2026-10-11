import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { BookDto } from '@library/shared'
import { buildApp } from '../../app.js'
import { loadEnv } from '../../config/env.js'
import { authors, genres } from '../../db/schema/index.js'
import { loginAs } from '../../test/auth.js'
import { createTestDb, truncateAll } from '../../test/db.js'

const { db, close } = createTestDb()
let app: FastifyInstance
let admin: string
let member: string

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
  await db.insert(genres).values([
    { name: 'Fantasy', slug: 'fantasy' },
    { name: 'Science Fiction', slug: 'scifi' },
  ])
  await db.insert(authors).values({ name: 'Frank Herbert' })
  admin = await loginAs(app, db, 'admin')
  member = await loginAs(app, db, 'member')
})

const valid = { title: 'Dune', authorNames: ['frank herbert', 'New Author'], genreSlugs: ['scifi'], isbn: '978-0441172719' }

const send = (method: 'POST' | 'PUT' | 'DELETE' | 'GET', url: string, cookie?: string, payload?: unknown) =>
  app.inject({ method, url, payload: payload as object, headers: cookie ? { cookie } : {} })

const create = async (body: object = valid) => (await send('POST', '/api/books', admin, body)).json<BookDto>()

describe('POST /api/books', () => {
  it('creates a book for an admin, reusing existing authors case-insensitively', async () => {
    const res = await send('POST', '/api/books', admin, valid)
    expect(res.statusCode).toBe(201)
    const book = res.json<BookDto>()
    expect(book).toMatchObject({ title: 'Dune', isbn: '9780441172719' })
    expect(book.authors.map((a) => a.name)).toEqual(['Frank Herbert', 'New Author'])
    expect(book.genres.map((g) => g.slug)).toEqual(['scifi'])
    expect(await db.select().from(authors)).toHaveLength(2)

    const get = await send('GET', `/api/books/${book.id}`)
    expect(get.statusCode).toBe(200)
    expect(get.json()).toEqual(book)
  })

  it('returns 403 for a member and 401 when anonymous', async () => {
    expect((await send('POST', '/api/books', member, valid)).statusCode).toBe(403)
    expect((await send('POST', '/api/books', undefined, valid)).statusCode).toBe(401)
  })

  it('returns 400 for an invalid body', async () => {
    const res = await send('POST', '/api/books', admin, { title: '', authorNames: [] })
    expect(res.statusCode).toBe(400)
    expect(res.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } })
  })

  it('returns 400 naming an unknown genre slug', async () => {
    const res = await send('POST', '/api/books', admin, { ...valid, genreSlugs: ['scifi', 'nope'] })
    expect(res.statusCode).toBe(400)
    expect(res.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR', details: { genreSlugs: ['nope'] } } })
    expect(res.json().error.message).toContain('nope')
  })

  it('returns 409 for a duplicate ISBN', async () => {
    await create()
    const res = await send('POST', '/api/books', admin, { ...valid, title: 'Dune Messiah' })
    expect(res.statusCode).toBe(409)
    expect(res.json()).toMatchObject({ error: { code: 'CONFLICT' } })
  })
})

describe('PUT /api/books/:id', () => {
  it('replaces fields, authors and genres', async () => {
    const book = await create()
    const res = await send('PUT', `/api/books/${book.id}`, admin, {
      title: 'Dune (2nd ed.)',
      authorNames: ['Brian Herbert', 'Frank Herbert'],
      genreSlugs: ['fantasy'],
    })
    expect(res.statusCode).toBe(200)
    const updated = res.json<BookDto>()
    expect(updated).toMatchObject({ id: book.id, title: 'Dune (2nd ed.)', isbn: null })
    expect(updated.authors.map((a) => a.name)).toEqual(['Brian Herbert', 'Frank Herbert'])
    expect(updated.genres.map((g) => g.slug)).toEqual(['fantasy'])
    expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(book.updatedAt).getTime())
  })

  it('returns 404 for a missing book, 403 for a member', async () => {
    const missing = '00000000-0000-4000-8000-000000000000'
    expect((await send('PUT', `/api/books/${missing}`, admin, valid)).statusCode).toBe(404)
    expect((await send('PUT', `/api/books/${missing}`, member, valid)).statusCode).toBe(403)
  })

  it('returns 401 when anonymous and 400 for an invalid body', async () => {
    const book = await create()
    expect((await send('PUT', `/api/books/${book.id}`, undefined, valid)).statusCode).toBe(401)
    const res = await send('PUT', `/api/books/${book.id}`, admin, { title: '' })
    expect(res.statusCode).toBe(400)
    expect(res.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } })
  })
})

describe('DELETE /api/books/:id', () => {
  it('deletes a book', async () => {
    const book = await create()
    expect((await send('DELETE', `/api/books/${book.id}`, admin)).statusCode).toBe(204)
    expect((await send('GET', `/api/books/${book.id}`)).statusCode).toBe(404)
  })

  it('returns 404 for a missing book and 403 for a member', async () => {
    const book = await create()
    expect((await send('DELETE', `/api/books/${book.id}`)).statusCode).toBe(401)
    expect((await send('DELETE', `/api/books/${book.id}`, member)).statusCode).toBe(403)
    expect((await send('DELETE', '/api/books/00000000-0000-4000-8000-000000000000', admin)).statusCode).toBe(404)
  })
})
