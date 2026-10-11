import { asc, ilike } from 'drizzle-orm'
import type { AuthorDto, GenreDto } from '@library/shared'
import type { Database } from '../../db/client.js'
import { authors, genres } from '../../db/schema/index.js'

export function listGenres(db: Database): Promise<GenreDto[]> {
  return db.select({ id: genres.id, name: genres.name, slug: genres.slug }).from(genres).orderBy(asc(genres.name))
}

/** Authors whose name contains `q` (case-insensitive), ordered by name; for form autocomplete. */
export function searchAuthors(db: Database, q: string | undefined, limit: number): Promise<AuthorDto[]> {
  const pattern = q ? `%${q.replace(/[\\%_]/g, '\\$&')}%` : undefined
  return db
    .select({ id: authors.id, name: authors.name })
    .from(authors)
    .where(pattern ? ilike(authors.name, pattern) : undefined)
    .orderBy(asc(authors.name))
    .limit(limit)
}
