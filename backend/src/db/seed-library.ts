import { createHash } from 'node:crypto'
import { inArray } from 'drizzle-orm'
import type { Database } from './client.js'
import { authors, bookAuthors, bookGenres, books, genres } from './schema/index.js'
import seedBooks from './seed/books.json' with { type: 'json' }

interface SeedBook {
  title: string
  subtitle?: string
  authors: string[]
  isbn: string
  publishedYear: number | null
  pageCount?: number
  description: string
  genres: string[]
  coverUrl: string
  averageRating?: number
}

export const slugify = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/** Deterministic pseudo-rating in 2.50 - 5.00 so seeds are reproducible. */
export function seedRating(key: string): number {
  const n = createHash('sha256').update(key).digest().readUInt32BE(0)
  return Math.round((2.5 + (n % 251) / 100) * 100) / 100
}

/** Idempotent: safe to run repeatedly (existing rows are left alone). */
export async function seedLibrary(db: Database): Promise<{ books: number }> {
  const data: SeedBook[] = seedBooks
  await db.transaction(async (tx) => {
    const genreNames = [...new Set(data.flatMap((b) => b.genres))]
    await tx
      .insert(genres)
      .values(genreNames.map((name) => ({ name, slug: slugify(name) })))
      .onConflictDoNothing()
    const authorNames = [...new Set(data.flatMap((b) => b.authors))]
    await tx
      .insert(authors)
      .values(authorNames.map((name) => ({ name })))
      .onConflictDoNothing()
    await tx
      .insert(books)
      .values(
        data.map((b) => ({
          title: b.title,
          subtitle: b.subtitle,
          description: b.description,
          isbn: b.isbn,
          coverUrl: b.coverUrl,
          publishedYear: b.publishedYear,
          pageCount: b.pageCount,
          averageRating: b.averageRating ?? seedRating(b.isbn),
        })),
      )
      .onConflictDoNothing({ target: books.isbn })

    const genreIds = new Map(
      (await tx.select({ id: genres.id, name: genres.name }).from(genres).where(inArray(genres.name, genreNames))).map(
        (g) => [g.name, g.id],
      ),
    )
    const authorIds = new Map(
      (await tx.select({ id: authors.id, name: authors.name }).from(authors).where(inArray(authors.name, authorNames))).map(
        (a) => [a.name, a.id],
      ),
    )
    const bookIds = new Map(
      (
        await tx
          .select({ id: books.id, isbn: books.isbn })
          .from(books)
          .where(inArray(books.isbn, data.map((b) => b.isbn)))
      ).map((b) => [b.isbn, b.id]),
    )

    const authorLinks = data.flatMap((b) =>
      b.authors.map((name, position) => ({
        bookId: bookIds.get(b.isbn)!,
        authorId: authorIds.get(name)!,
        position,
      })),
    )
    const genreLinks = data.flatMap((b) =>
      b.genres.map((name) => ({ bookId: bookIds.get(b.isbn)!, genreId: genreIds.get(name)! })),
    )
    await tx.insert(bookAuthors).values(authorLinks).onConflictDoNothing()
    await tx.insert(bookGenres).values(genreLinks).onConflictDoNothing()
  })
  return { books: data.length }
}
