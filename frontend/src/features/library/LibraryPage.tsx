import { useLocation } from 'react-router'
import { useBooksInfinite } from '../books/api'
import { BookGrid } from './BookGrid'
import { FilterPanel } from './FilterPanel'
import { SearchBar } from './SearchBar'
import { useLibraryFilters } from './useLibraryFilters'
import styles from './LibraryPage.module.css'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'

export function LibraryPage() {
  useDocumentTitle('Library')
  const { filters, setFilters, clearFilters, activeCount } = useLibraryFilters()
  const query = useBooksInfinite(filters)
  const state: unknown = useLocation().state
  const message =
    typeof state === 'object' && state !== null && 'message' in state && typeof state.message === 'string'
      ? state.message
      : ''
  const books = query.data?.pages.flatMap((p) => p.items) ?? []
  // The URL only carries the author id; the name comes from any loaded book by that author.
  const authorName = books.flatMap((b) => b.authors).find((a) => a.id === filters.author)?.name
  const total = query.data?.pages[0]?.total ?? 0

  return (
    <section>
      <h1>Library</h1>
      <p role="status" aria-live="polite" className={styles.status}>
        {message}
      </p>
      <div className={styles.layout}>
        <div className={styles.sidebar}>
          <SearchBar q={filters.q} onChange={(q) => setFilters({ q })} />
          <FilterPanel filters={filters} activeCount={activeCount} onChange={setFilters} onClear={clearFilters} />
        </div>
        <div className={styles.results}>
          {filters.author && (
            <p className={styles.activeFilter}>
              <span>Author: {authorName ?? '…'}</span>
              <button
                type="button"
                aria-label="Remove author filter"
                onClick={() => setFilters({ author: undefined })}
              >
                ×
              </button>
            </p>
          )}
          <BookGrid
            books={books}
            total={total}
            isLoading={query.isPending}
            isRefreshing={query.isPlaceholderData}
            error={query.error}
            onRetry={() => void query.refetch()}
            hasNextPage={query.hasNextPage}
            isFetchingNextPage={query.isFetchingNextPage}
            fetchNextPage={() => void query.fetchNextPage()}
            onClearFilters={clearFilters}
          />
        </div>
      </div>
    </section>
  )
}
