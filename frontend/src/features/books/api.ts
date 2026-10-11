import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import type { BookListResponse, BookSort, GenreDto } from '@library/shared'
import { apiGet } from '../../api/client'

export interface BookFilters {
  q: string
  genres: string[]
  yearFrom?: number
  yearTo?: number
  minRating?: number
  /** Undefined means "server default" (relevance when searching, otherwise title). */
  sort?: BookSort
  order?: 'asc' | 'desc'
}

export const PAGE_SIZE = 24

export const bookKeys = {
  all: ['books'] as const,
  list: (filters: BookFilters) => ['books', 'list', filters] as const,
  genres: ['genres'] as const,
}

export function buildBooksQuery(filters: BookFilters, page: number): string {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  for (const genre of filters.genres) params.append('genre', genre)
  if (filters.yearFrom !== undefined) params.set('yearFrom', String(filters.yearFrom))
  if (filters.yearTo !== undefined) params.set('yearTo', String(filters.yearTo))
  if (filters.minRating !== undefined) params.set('minRating', String(filters.minRating))
  if (filters.sort) params.set('sort', filters.sort)
  if (filters.order) params.set('order', filters.order)
  params.set('page', String(page))
  params.set('pageSize', String(PAGE_SIZE))
  return params.toString()
}

export const fetchBooks = (filters: BookFilters, page: number) =>
  apiGet<BookListResponse>(`/api/books?${buildBooksQuery(filters, page)}`)

export const fetchGenres = () => apiGet<GenreDto[]>('/api/genres')

export function useBooksInfinite(filters: BookFilters) {
  return useInfiniteQuery({
    queryKey: bookKeys.list(filters),
    queryFn: ({ pageParam }) => fetchBooks(filters, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
    placeholderData: keepPreviousData,
  })
}

export function useGenres() {
  return useQuery({ queryKey: bookKeys.genres, queryFn: fetchGenres, staleTime: 60 * 60 * 1000 })
}
