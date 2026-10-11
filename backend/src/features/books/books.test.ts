import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { bookListResponseSchema, type BookDto } from '@library/shared'
import { buildApp } from '../../app.js'
import { loadEnv } from '../../config/env.js'
import { authors, bookAuthors, bookGenres, books, genres } from '../../db/schema/index.js'
import { createTestDb, truncateAll } from '../../test/db.js'

const { db, close } = createTestDb()
let app: FastifyInstance
const ids: Record<string, string> = {}

const fixtures = [
  { key: 'hp', title: 'Harry Potter and the Philosopher\'s Stone', year: 1997, rating: 4.8, authors: ['J.K. Rowling'], genres: ['fantasy'] },
  { key: 'hobbit', title: 'The Hobbit', year: 1937, rating: 4.6, authors: ['J.R.R. Tolkien'], genres: ['fantasy', 'adventure'] },
  { key: 'lotr', title: 'The Fellowship of the Ring', year: 1954, rating: 4.7, authors: ['J.R.R. Tolkien'], genres: ['fantasy'] },
  { key: 'dune', title: 'Dune', year: 1965, rating: 4.3, authors: ['Frank Herbert'], genres: ['scifi'] },
  { key: 'gg', title: 'Good Omens', year: 1990, rating: 4.1, authors: ['Terry Pratchett', 'Neil Gaiman'], genres: ['fantasy', 'comedy'] },
  { key: 'anon', title: 'Beowulf', year: null, rating: null, authors: ['Anonymous'], genres: ['adventure'] },
] as const

beforeAll(async () => {
  app = await buildApp({ env: loadEnv(), db })
  await truncateAll(db)

  const genreRows = await db
    .insert(genres)
    .values(['fantasy', 'adventure', 'scifi', 'comedy'].map((s) => ({ name: s[0]!.toUpperCase() + s.slice(1), slug: s })))
    .returning()
  const authorNames = [...new Set(fixtures.flatMap((f) => f.authors))]
  const authorRows = await db.insert(authors).values(authorNames.map((name) => ({ name }))).returning()

  for (const [i, f] of fixtures.entries()) {
    const [book] = await db
      .insert(books)
      .values({
        title: f.title,
        publishedYear: f.year,
        averageRating: f.rating,
        // distinct createdAt so 'newest' ordering is deterministic
        createdAt: new Date(2024, 0, 1 + i),
      })
      .returning()
    ids[f.key] = book!.id
    await db.insert(bookAuthors).values(
      f.authors.map((name, position) => ({
        bookId: book!.id,
        authorId: authorRows.find((a) => a.name === name)!.id,
        position,
      })),
    )
    await db.insert(bookGenres).values(
      f.genres.map((slug) => ({ bookId: book!.id, genreId: genreRows.find((g) => g.slug === slug)!.id })),
    )
  }
})

afterAll(async () => {
  await truncateAll(db)
  await app.close()
  await close()
})

async function list(qs = '') {
  const res = await app.inject({ method: 'GET', url: `/api/books${qs}` })
  return { status: res.statusCode, body: res.json() }
}

async function titles(qs: string): Promise<string[]> {
  const { status, body } = await list(qs)
  expect(status).toBe(200)
  return (body as { items: BookDto[] }).items.map((b) => b.title)
}

describe('GET /api/books', () => {
  it('returns a paginated list with authors and genres', async () => {
    const { status, body } = await list()
    expect(status).toBe(200)
    const parsed = bookListResponseSchema.parse(body)
    expect(parsed).toMatchObject({ total: 6, page: 1, pageSize: 24, totalPages: 1 })
    expect(parsed.items.map((b) => b.title)[0]).toBe('Beowulf')
    const goodOmens = parsed.items.find((b) => b.id === ids.gg)!
    expect(goodOmens.authors.map((a) => a.name)).toEqual(['Terry Pratchett', 'Neil Gaiman'])
    expect(goodOmens.genres.map((g) => g.slug)).toEqual(['comedy', 'fantasy'])
  })

  it('rejects pageSize above 100', async () => {
    const { status, body } = await list('?pageSize=101')
    expect(status).toBe(400)
    expect(body).toMatchObject({ error: { code: 'VALIDATION_ERROR' } })
  })

  it('paginates (page 2)', async () => {
    const { body } = await list('?pageSize=4&page=2')
    expect(body).toMatchObject({ total: 6, page: 2, pageSize: 4, totalPages: 2 })
    expect(body.items).toHaveLength(2)
    expect(await titles('?pageSize=4')).toHaveLength(4)
  })

  it('searches by title fragment', async () => {
    expect(await titles('?q=hobb')).toEqual(['The Hobbit'])
  })

  it('searches by author name', async () => {
    expect((await titles('?q=tolkien')).sort()).toEqual(['The Fellowship of the Ring', 'The Hobbit'])
  })

  it('tolerates typos', async () => {
    expect((await titles('?q=hary poter'))[0]).toBe("Harry Potter and the Philosopher's Stone")
  })

  it('treats LIKE wildcards literally', async () => {
    expect(await titles('?q=%25')).toEqual([])
  })

  it('filters by one or several genres', async () => {
    expect(await titles('?genre=scifi')).toEqual(['Dune'])
    expect(await titles('?genre=scifi&genre=comedy&sort=title')).toEqual(['Dune', 'Good Omens'])
    expect(await titles('?genre=scifi,comedy')).toHaveLength(2)
  })

  it('filters by author id', async () => {
    const authorsRes = await app.inject({ method: 'GET', url: '/api/authors?q=tolkien' })
    const [tolkien] = authorsRes.json() as { id: string }[]
    expect(await titles(`?author=${tolkien!.id}`)).toHaveLength(2)
  })

  it('filters by year range (inclusive)', async () => {
    expect((await titles('?yearFrom=1954&yearTo=1990')).sort()).toEqual([
      'Dune',
      'Good Omens',
      'The Fellowship of the Ring',
    ])
  })

  it('filters by minimum rating', async () => {
    expect((await titles('?minRating=4.6&sort=rating&order=desc'))).toEqual([
      "Harry Potter and the Philosopher's Stone",
      'The Fellowship of the Ring',
      'The Hobbit',
    ])
  })

  it('sorts by year descending with nulls last', async () => {
    const result = await titles('?sort=year&order=desc')
    expect(result[0]).toBe("Harry Potter and the Philosopher's Stone")
    expect(result.at(-1)).toBe('Beowulf')
  })

  it('sorts by year ascending with nulls last', async () => {
    const result = await titles('?sort=year&order=asc')
    expect(result[0]).toBe('The Hobbit')
    expect(result.at(-1)).toBe('Beowulf')
  })

  it('sorts by newest', async () => {
    expect((await titles('?sort=newest&order=desc'))[0]).toBe('Beowulf')
  })

  it('respects an explicit sort over relevance when searching', async () => {
    expect(await titles('?q=tolkien&sort=title')).toEqual(['The Fellowship of the Ring', 'The Hobbit'])
  })
})

describe('GET /api/books/:id', () => {
  it('returns the book', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/books/${ids.dune}` })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ id: ids.dune, title: 'Dune', authors: [{ name: 'Frank Herbert' }] })
  })

  it('returns 404 for an unknown id', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/books/00000000-0000-4000-8000-000000000000' })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toMatchObject({ error: { code: 'NOT_FOUND' } })
  })

  it('returns 400 for an invalid uuid', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/books/not-a-uuid' })
    expect(res.statusCode).toBe(400)
  })
})

describe('lookups', () => {
  it('lists genres ordered by name', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/genres' })
    expect(res.statusCode).toBe(200)
    expect((res.json() as { name: string }[]).map((g) => g.name)).toEqual(['Adventure', 'Comedy', 'Fantasy', 'Scifi'])
  })

  it('finds authors by name and honours limit', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/authors?q=j.' })
    expect((res.json() as { name: string }[]).map((a) => a.name)).toEqual(['J.K. Rowling', 'J.R.R. Tolkien'])
    const limited = await app.inject({ method: 'GET', url: '/api/authors?limit=2' })
    expect(limited.json()).toHaveLength(2)
  })

  it('rejects limit above 50', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/authors?limit=51' })
    expect(res.statusCode).toBe(400)
  })
})
