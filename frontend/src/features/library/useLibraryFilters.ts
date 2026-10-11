import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { bookSortSchema } from '@library/shared'
import type { BookFilters } from '../books/api'

function parseNumber(value: string | null): number | undefined {
  if (value === null || value.trim() === '') return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

export function parseFilters(params: URLSearchParams): BookFilters {
  const sort = bookSortSchema.safeParse(params.get('sort'))
  const order = params.get('order')
  return {
    q: params.get('q')?.trim() ?? '',
    genres: params.getAll('genre').filter(Boolean),
    yearFrom: parseNumber(params.get('yearFrom')),
    yearTo: parseNumber(params.get('yearTo')),
    minRating: parseNumber(params.get('minRating')),
    sort: sort.success ? sort.data : undefined,
    order: order === 'asc' || order === 'desc' ? order : undefined,
  }
}

export function serializeFilters(filters: BookFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  for (const genre of filters.genres) params.append('genre', genre)
  if (filters.yearFrom !== undefined) params.set('yearFrom', String(filters.yearFrom))
  if (filters.yearTo !== undefined) params.set('yearTo', String(filters.yearTo))
  if (filters.minRating !== undefined) params.set('minRating', String(filters.minRating))
  if (filters.sort) params.set('sort', filters.sort)
  if (filters.order) params.set('order', filters.order)
  return params
}

/** Number of active filters, not counting the search text. */
export function countActiveFilters(f: BookFilters): number {
  return (
    f.genres.length +
    [f.yearFrom, f.yearTo, f.minRating, f.sort].filter((v) => v !== undefined).length
  )
}

/** Filters live in the URL so they are shareable and survive back/forward. */
export function useLibraryFilters() {
  const [params, setParams] = useSearchParams()
  const filters = useMemo(() => parseFilters(params), [params])

  // Replace (not push) so typing doesn't spam history. Paging is not in the URL,
  // so any change starts again from page 1 via the new query key.
  const setFilters = useCallback(
    (patch: Partial<BookFilters>) => {
      setParams((current) => serializeFilters({ ...parseFilters(current), ...patch }), {
        replace: true,
      })
    },
    [setParams],
  )

  const clearFilters = useCallback(() => setParams(new URLSearchParams(), { replace: true }), [setParams])

  return { filters, setFilters, clearFilters, activeCount: countActiveFilters(filters) }
}
