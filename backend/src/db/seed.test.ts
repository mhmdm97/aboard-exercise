import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { count, sql } from 'drizzle-orm'
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

  it('stores ratings between 0 and 5', async () => {
    const bad = await db
      .select({ n: count() })
      .from(books)
      .where(sql`${books.averageRating} IS NULL OR ${books.averageRating} NOT BETWEEN 0 AND 5`)
    expect(first(bad).n).toBe(0)
  })
})
