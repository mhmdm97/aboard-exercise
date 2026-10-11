import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { count, eq, like, sql } from 'drizzle-orm'
import { createTestDb, truncateAll } from '../test/db.js'
import { bookAuthors, books } from './schema/index.js'
import { seedLibrary } from './seed-library.js'

const { db, close } = createTestDb()
const first = <T>(rows: T[]): T => rows[0]!

beforeAll(() => truncateAll(db))
afterAll(async () => {
  await truncateAll(db)
  await close()
})

describe('seedLibrary', () => {
  const total = async (table: typeof books | typeof bookAuthors) =>
    first(await db.select({ n: count() }).from(table)).n

  it('seeds at least 200 books, each with an author, and is idempotent', async () => {
    await seedLibrary(db)
    const bookCount = await total(books)
    expect(bookCount).toBeGreaterThanOrEqual(200)

    const withoutAuthor = await db
      .select({ n: count() })
      .from(books)
      .where(sql`NOT EXISTS (SELECT 1 FROM ${bookAuthors} WHERE ${bookAuthors.bookId} = ${books.id})`)
    expect(first(withoutAuthor).n).toBe(0)

    const linkCount = await total(bookAuthors)
    await seedLibrary(db)
    expect(await total(books)).toBe(bookCount)
    expect(await total(bookAuthors)).toBe(linkCount)
  })

  it('switches old Open Library cover URLs to self-hosted ones but keeps custom covers', async () => {
    const seeded = await db.select({ isbn: books.isbn, coverUrl: books.coverUrl }).from(books).where(like(books.coverUrl, '/covers/%')).limit(2)
    const [a, b] = seeded as [(typeof seeded)[number], (typeof seeded)[number]]
    const id = Number(/\/covers\/(\d+)\.jpg$/.exec(a.coverUrl ?? '')?.[1])
    expect(id).toBeGreaterThan(0)
    await db
      .update(books)
      .set({ coverUrl: `https://covers.openlibrary.org/b/id/${id}-M.jpg` })
      .where(eq(books.isbn, a.isbn!))
    await db.update(books).set({ coverUrl: 'https://example.com/custom.jpg' }).where(eq(books.isbn, b.isbn!))

    await seedLibrary(db)

    const after = async (isbn: string | null) =>
      first(await db.select({ coverUrl: books.coverUrl }).from(books).where(eq(books.isbn, isbn!))).coverUrl
    expect(await after(a.isbn)).toBe(`/covers/${id}.jpg`)
    expect(await after(b.isbn)).toBe('https://example.com/custom.jpg')
  })

  it('stores ratings between 0 and 5', async () => {
    const bad = await db
      .select({ n: count() })
      .from(books)
      .where(sql`${books.averageRating} IS NULL OR ${books.averageRating} NOT BETWEEN 0 AND 5`)
    expect(first(bad).n).toBe(0)
  })
})
