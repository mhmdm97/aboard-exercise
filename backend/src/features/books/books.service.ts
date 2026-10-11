import { and, asc, desc, eq, gte, inArray, lte, sql, type SQL } from 'drizzle-orm'
import type { AuthorDto, BookDto, BookListQuery, BookListResponse, GenreDto } from '@library/shared'
import type { Database } from '../../db/client.js'
import { authors, bookAuthors, bookGenres, books, genres } from '../../db/schema/index.js'

type BookRow = typeof books.$inferSelect

/** Single row→DTO mapping, reused by list/get (and the write endpoints). */
export function toBookDto(row: BookRow, bookAuthorList: AuthorDto[], bookGenreList: GenreDto[]): BookDto {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    description: row.description,
    isbn: row.isbn,
    coverUrl: row.coverUrl,
    publishedYear: row.publishedYear,
    pageCount: row.pageCount,
    averageRating: row.averageRating,
    authors: bookAuthorList,
    genres: bookGenreList,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

/** Loads authors (ordered by position) and genres for the given rows in 2 queries and maps to DTOs. */
async function hydrateBooks(db: Database, rows: BookRow[]): Promise<BookDto[]> {
  if (rows.length === 0) return []
  const ids = rows.map((r) => r.id)

  const [authorRows, genreRows] = await Promise.all([
    db
      .select({ bookId: bookAuthors.bookId, id: authors.id, name: authors.name })
      .from(bookAuthors)
      .innerJoin(authors, eq(authors.id, bookAuthors.authorId))
      .where(inArray(bookAuthors.bookId, ids))
      .orderBy(asc(bookAuthors.position), asc(authors.name)),
    db
      .select({ bookId: bookGenres.bookId, id: genres.id, name: genres.name, slug: genres.slug })
      .from(bookGenres)
      .innerJoin(genres, eq(genres.id, bookGenres.genreId))
      .where(inArray(bookGenres.bookId, ids))
      .orderBy(asc(genres.name)),
  ])

  const authorsByBook = new Map<string, AuthorDto[]>()
  for (const { bookId, ...a } of authorRows) {
    authorsByBook.set(bookId, [...(authorsByBook.get(bookId) ?? []), a])
  }
  const genresByBook = new Map<string, GenreDto[]>()
  for (const { bookId, ...g } of genreRows) {
    genresByBook.set(bookId, [...(genresByBook.get(bookId) ?? []), g])
  }
  return rows.map((r) => toBookDto(r, authorsByBook.get(r.id) ?? [], genresByBook.get(r.id) ?? []))
}

export async function getBookById(db: Database, id: string): Promise<BookDto | null> {
  const [row] = await db.select().from(books).where(eq(books.id, id)).limit(1)
  if (!row) return null
  return (await hydrateBooks(db, [row]))[0] ?? null
}

/** Escapes LIKE wildcards so user input is matched literally. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&')
}

const FUZZY_THRESHOLD = 0.4

function searchConditions(q: string) {
  const like = `%${escapeLike(q)}%`

  const match = sql`(
    ${books.title} ilike ${like} or ${books.subtitle} ilike ${like}
    or word_similarity(${q}, ${books.title}) > ${FUZZY_THRESHOLD}
    or exists (
      select 1 from ${bookAuthors} ba join ${authors} a on a.id = ba.author_id
      where ba.book_id = ${books.id}
        and (a.name ilike ${like} or word_similarity(${q}, a.name) > ${FUZZY_THRESHOLD}))
  )`

  // Best similarity across title / subtitle / authors; substring title hits get a boost.
  const relevance = sql`greatest(
    word_similarity(${q}, ${books.title}),
    coalesce(word_similarity(${q}, ${books.subtitle}), 0),
    coalesce((select max(word_similarity(${q}, a.name)) from ${bookAuthors} ba
      join ${authors} a on a.id = ba.author_id where ba.book_id = ${books.id}), 0)
  ) + (case when ${books.title} ilike ${like} then 1 else 0 end)`

  return { match, relevance }
}

export interface ListBooksOptions {
  /** Order by relevance when searching (set by the route when the caller gave no explicit sort). */
  relevance?: boolean
}

export async function listBooks(
  db: Database,
  query: BookListQuery,
  { relevance: useRelevance = false }: ListBooksOptions = {},
): Promise<BookListResponse> {
  const { q, genre, author, yearFrom, yearTo, minRating, sort, order, page, pageSize } = query
  const conditions: (SQL | undefined)[] = []
  const search = q ? searchConditions(q) : null

  if (search) conditions.push(search.match)
  if (genre?.length) {
    conditions.push(sql`exists (
      select 1 from ${bookGenres} bg join ${genres} g on g.id = bg.genre_id
      where bg.book_id = ${books.id} and g.slug in (${sql.join(genre.map((s) => sql`${s}`), sql`, `)}))`)
  }
  if (author) {
    conditions.push(
      sql`exists (select 1 from ${bookAuthors} ba where ba.book_id = ${books.id} and ba.author_id = ${author})`,
    )
  }
  if (yearFrom !== undefined) conditions.push(gte(books.publishedYear, yearFrom))
  if (yearTo !== undefined) conditions.push(lte(books.publishedYear, yearTo))
  if (minRating !== undefined) conditions.push(gte(books.averageRating, minRating))
  const where = and(...conditions)

  const sortColumn = { title: books.title, year: books.publishedYear, rating: books.averageRating, newest: books.createdAt }[sort]
  const orderBy: SQL[] = []
  if (search && useRelevance) orderBy.push(sql`${search.relevance} desc`)
  // NULLs always last, whatever the direction.
  orderBy.push(sql`${sortColumn} ${sql.raw(order === 'desc' ? 'desc' : 'asc')} nulls last`)
  if (sort !== 'title') orderBy.push(order === 'desc' ? desc(books.title) : asc(books.title))
  orderBy.push(asc(books.id))

  const [rows, [countRow]] = await Promise.all([
    db
      .select()
      .from(books)
      .where(where)
      .orderBy(...orderBy)
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: sql<number>`count(*)::int` }).from(books).where(where),
  ])
  const total = countRow?.total ?? 0

  return {
    items: await hydrateBooks(db, rows),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}
