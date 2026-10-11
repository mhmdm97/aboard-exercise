import type { InfiniteData, QueryClient } from '@tanstack/react-query'
import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AuthorDto, BookDto, BookInput, BookListResponse, BookSort, GenreDto } from '@library/shared'
import { apiDelete, apiGet, apiPost, apiPut } from '../../api/client'

export interface BookFilters {
  q: string
  genres: string[]
  /** Author id (uuid). */
  author?: string
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
  authors: (q: string) => ['authors', q] as const,
  detail: (id: string) => ['books', 'detail', id] as const,
}

export function buildBooksQuery(filters: BookFilters, page: number): string {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  for (const genre of filters.genres) params.append('genre', genre)
  if (filters.author) params.set('author', filters.author)
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

/** A book already loaded by a list (library pages or favourites), so the detail page can render before its own fetch. */
function findCachedBook(queryClient: QueryClient, id: string): BookDto | undefined {
  for (const [, data] of queryClient.getQueriesData<InfiniteData<BookListResponse>>({ queryKey: ['books', 'list'] })) {
    const hit = data?.pages.flatMap((p) => p.items).find((b) => b.id === id)
    if (hit) return hit
  }
  return queryClient.getQueryData<BookDto[]>(['favourites', 'list'])?.find((b) => b.id === id)
}

/**
 * `showCachedFirst`: render the copy from a loaded list straight away while the real fetch runs. The detail page uses it
 * so the cover exists in the first frame of the card -> detail View Transition; forms must not (they copy the data once).
 */
export function useBook(id: string, { showCachedFirst = false } = {}) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: bookKeys.detail(id),
    queryFn: () => apiGet<BookDto>(`/api/books/${id}`),
    placeholderData: showCachedFirst ? () => findCachedBook(queryClient, id) : undefined,
  })
}

export function useDeleteBook(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => apiDelete(`/api/books/${id}`),
    onSuccess: () => {
      // Not awaited: the page navigates away right after, and refetches happen in the background.
      void queryClient.invalidateQueries({ queryKey: ['books', 'list'] })
      void queryClient.invalidateQueries({ queryKey: ['favourites'] })
    },
  })
}

export function useAuthorSuggestions(q: string) {
  return useQuery({
    queryKey: bookKeys.authors(q),
    queryFn: () => apiGet<AuthorDto[]>(`/api/authors?${new URLSearchParams({ q, limit: '8' })}`),
    enabled: q.length >= 2,
    staleTime: 60 * 1000,
  })
}

/** Creates a book, or fully replaces `id` when given. */
export function useSaveBook(id?: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: BookInput) =>
      id ? apiPut<BookDto>(`/api/books/${id}`, input) : apiPost<BookDto>('/api/books', input),
    onSuccess: (book) => {
      queryClient.setQueryData(bookKeys.detail(book.id), book)
      void queryClient.invalidateQueries({ queryKey: ['books', 'list'] })
      void queryClient.invalidateQueries({ queryKey: ['favourites'] })
    },
  })
}
