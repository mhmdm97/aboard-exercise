import { useLocation } from 'react-router'
import { Toast } from '../../components/Toast/Toast'
import { useBooksInfinite, useGenres } from '../books/api'
import { ActiveFilters } from './ActiveFilters'
import { buildActiveChips } from './activeChips'
import { BookGrid } from './BookGrid'
import { FilterDrawer } from './FilterDrawer'
import { FilterPanel } from './FilterPanel'
import { SearchBar } from './SearchBar'
import { useLibraryFilters } from './useLibraryFilters'
import styles from './LibraryPage.module.css'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'

export function LibraryPage() {
  useDocumentTitle('Library')
  const { filters, setFilters, clearFilters, activeCount } = useLibraryFilters()
  const query = useBooksInfinite(filters)
  const genres = useGenres()
  const state: unknown = useLocation().state
  const message =
    typeof state === 'object' && state !== null && 'message' in state && typeof state.message === 'string'
      ? state.message
      : ''
  const books = query.data?.pages.flatMap((p) => p.items) ?? []
  // The URL only carries the author id; the name comes from any loaded book by that author.
  const authorName = books.flatMap((b) => b.authors).find((a) => a.id === filters.author)?.name
  const total = query.data?.pages[0]?.total ?? 0
  const chips = buildActiveChips(filters, genres.data, authorName)
  const canClear = activeCount > 0 || !!filters.q

  return (
    <section>
      <div className={styles.intro}>
        <h1 className={styles.title}>The Library</h1>
        <p className={styles.lede}>Every book on the shelf. Filter by genre, year and rating, or just search.</p>
      </div>
      <Toast message={message} />
      <div className={styles.search}>
        <SearchBar q={filters.q} onChange={(q) => setFilters({ q })} />
      </div>
      <div className={styles.layout}>
        <FilterPanel filters={filters} canClear={canClear} onChange={setFilters} onClear={clearFilters} />
        <div className={styles.results}>
          <div className={styles.bar}>
            <FilterDrawer
              filters={filters}
              activeCount={activeCount}
              total={total}
              canClear={canClear}
              onChange={setFilters}
              onClear={clearFilters}
            />
            <p className={styles.count} aria-live="polite">
              {!query.isPending && (
                <>
                  <strong className={styles.num}>{total}</strong> {total === 1 ? 'book' : 'books'}
                </>
              )}
            </p>
            <div className={styles.chips}>
              <ActiveFilters chips={chips} onRemove={setFilters} />
            </div>
          </div>
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
