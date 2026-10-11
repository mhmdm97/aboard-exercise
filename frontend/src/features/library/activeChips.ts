import type { GenreDto } from '@library/shared'
import type { BookFilters } from '../books/api'

export interface ActiveChip {
  key: string
  label: string
  /** The filter patch that removes this chip. */
  remove: Partial<BookFilters>
}

const SORT_LABELS: Record<string, string> = { title: 'Title', year: 'Year', rating: 'Rating', newest: 'Recently added' }

/** One chip per active filter (the search text has its own box). */
export function buildActiveChips(
  filters: BookFilters,
  genres: GenreDto[] | undefined,
  authorName: string | undefined,
): ActiveChip[] {
  const chips: ActiveChip[] = filters.genres.map((slug) => ({
    key: `genre:${slug}`,
    label: `Genre: ${genres?.find((g) => g.slug === slug)?.name ?? slug}`,
    remove: { genres: filters.genres.filter((g) => g !== slug) },
  }))
  if (filters.author) {
    chips.push({ key: 'author', label: `Author: ${authorName ?? '…'}`, remove: { author: undefined } })
  }
  if (filters.yearFrom !== undefined) {
    chips.push({ key: 'yearFrom', label: `From ${filters.yearFrom}`, remove: { yearFrom: undefined } })
  }
  if (filters.yearTo !== undefined) {
    chips.push({ key: 'yearTo', label: `Until ${filters.yearTo}`, remove: { yearTo: undefined } })
  }
  if (filters.minRating !== undefined) {
    chips.push({ key: 'minRating', label: `Rating ${filters.minRating}+`, remove: { minRating: undefined } })
  }
  if (filters.sort) {
    const direction = filters.order === 'desc' ? 'descending' : 'ascending'
    chips.push({
      key: 'sort',
      label: `Sort: ${SORT_LABELS[filters.sort] ?? filters.sort} (${direction})`,
      remove: { sort: undefined, order: undefined },
    })
  }
  return chips
}
