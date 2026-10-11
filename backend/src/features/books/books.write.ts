import { eq, inArray, sql } from 'drizzle-orm'
import type { BookDto, BookInput } from '@library/shared'
import type { Database } from '../../db/client.js'
import { authors, bookAuthors, bookGenres, books, genres } from '../../db/schema/index.js'
import { getBookById } from './books.service.js'

export type WriteBookResult =
  | { ok: true; book: BookDto }
  | { ok: false; reason: 'not_found' }
  | { ok: false; reason: 'unknown_genres'; slugs: string[] }
  | { ok: false; reason: 'duplicate_isbn' }

type Tx = Parameters<Parameters<Database['transaction']>[0]>[0]

/** True for a Postgres unique violation (drizzle wraps the driver error in `cause`). */
function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } } | null
  return e?.code === '23505' || e?.cause?.code === '23505'
}

/** Resolves author names to ids (case-insensitive match on existing, insert new), keeping input order. */
async function resolveAuthorIds(tx: Tx, names: string[]): Promise<string[]> {
  const unique = [...new Map(names.map((n) => [n.toLowerCase(), n])).values()]
  const existing = await tx
    .select({ id: authors.id, name: authors.name })
    .from(authors)
    .where(inArray(sql`lower(${authors.name})`, unique.map((n) => n.toLowerCase())))
  const byLower = new Map(existing.map((a) => [a.name.toLowerCase(), a.id]))

  const missing = unique.filter((n) => !byLower.has(n.toLowerCase()))
  if (missing.length > 0) {
    const created = await tx.insert(authors).values(missing.map((name) => ({ name }))).returning()
    for (const a of created) byLower.set(a.name.toLowerCase(), a.id)
  }
  return unique.map((n) => byLower.get(n.toLowerCase())!)
}

/** Creates (no `id`) or fully replaces (with `id`) a book, its authors and genres in one transaction. */
export async function saveBook(
  db: Database,
  input: BookInput,
  opts: { id?: string; userId?: string },
): Promise<WriteBookResult> {
  const { authorNames, genreSlugs, ...fields } = input
  try {
    const bookId = await db.transaction(async (tx): Promise<string | WriteBookResult> => {
      const slugs = [...new Set(genreSlugs)]
      const genreRows = slugs.length
        ? await tx.select({ id: genres.id, slug: genres.slug }).from(genres).where(inArray(genres.slug, slugs))
        : []
      const unknown = slugs.filter((s) => !genreRows.some((g) => g.slug === s))
      if (unknown.length > 0) return { ok: false, reason: 'unknown_genres', slugs: unknown }

      let id: string
      if (opts.id) {
        const [row] = await tx
          .update(books)
          .set({ ...fields, updatedAt: new Date() })
          .where(eq(books.id, opts.id))
          .returning({ id: books.id })
        if (!row) return { ok: false, reason: 'not_found' }
        id = row.id
        await tx.delete(bookAuthors).where(eq(bookAuthors.bookId, id))
        await tx.delete(bookGenres).where(eq(bookGenres.bookId, id))
      } else {
        const [row] = await tx
          .insert(books)
          .values({ ...fields, createdBy: opts.userId })
          .returning({ id: books.id })
        id = row!.id
      }

      const authorIds = await resolveAuthorIds(tx, authorNames)
      await tx.insert(bookAuthors).values(authorIds.map((authorId, position) => ({ bookId: id, authorId, position })))
      if (genreRows.length > 0) {
        await tx.insert(bookGenres).values(genreRows.map((g) => ({ bookId: id, genreId: g.id })))
      }
      return id
    })
    if (typeof bookId !== 'string') return bookId
    return { ok: true, book: (await getBookById(db, bookId))! }
  } catch (err) {
    if (isUniqueViolation(err)) return { ok: false, reason: 'duplicate_isbn' }
    throw err
  }
}

/** Deletes a book (join rows and favourites cascade). Returns false if it does not exist. */
export async function deleteBook(db: Database, id: string): Promise<boolean> {
  const rows = await db.delete(books).where(eq(books.id, id)).returning({ id: books.id })
  return rows.length > 0
}
