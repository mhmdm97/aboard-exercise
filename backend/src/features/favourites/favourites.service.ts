import { and, desc, eq } from 'drizzle-orm'
import type { BookDto } from '@library/shared'
import type { Database } from '../../db/client.js'
import { books, favourites } from '../../db/schema/index.js'
import { hydrateBooks } from '../books/books.service.js'

/** Idempotent. Returns false if the book does not exist. */
export async function addFavourite(db: Database, userId: string, bookId: string): Promise<boolean> {
  const [book] = await db.select({ id: books.id }).from(books).where(eq(books.id, bookId)).limit(1)
  if (!book) return false
  await db.insert(favourites).values({ userId, bookId }).onConflictDoNothing()
  return true
}

export async function removeFavourite(db: Database, userId: string, bookId: string): Promise<void> {
  await db.delete(favourites).where(and(eq(favourites.userId, userId), eq(favourites.bookId, bookId)))
}

export async function listFavouriteIds(db: Database, userId: string): Promise<string[]> {
  const rows = await db
    .select({ bookId: favourites.bookId })
    .from(favourites)
    .where(eq(favourites.userId, userId))
    .orderBy(desc(favourites.createdAt))
  return rows.map((r) => r.bookId)
}

/** The user's favourite books, most recently favourited first. */
export async function listFavouriteBooks(db: Database, userId: string): Promise<BookDto[]> {
  const rows = await db
    .select({ book: books })
    .from(favourites)
    .innerJoin(books, eq(books.id, favourites.bookId))
    .where(eq(favourites.userId, userId))
    .orderBy(desc(favourites.createdAt))
  return hydrateBooks(db, rows.map((r) => r.book))
}
