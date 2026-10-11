import { useBooksInfinite } from '../books/api'
import { BookGrid } from './BookGrid'
import { FilterPanel } from './FilterPanel'
import { SearchBar } from './SearchBar'
import { useLibraryFilters } from './useLibraryFilters'
import styles from './LibraryPage.module.css'

export function LibraryPage() {
  const { filters, setFilters, clearFilters, activeCount } = useLibraryFilters()
  const query = useBooksInfinite(filters)
  const books = query.data?.pages.flatMap((p) => p.items) ?? []
  const total = query.data?.pages[0]?.total ?? 0

  return (
    <section>
      <h1>Library</h1>
      <div className={styles.layout}>
        <div className={styles.sidebar}>
          <SearchBar q={filters.q} onChange={(q) => setFilters({ q })} />
          <FilterPanel filters={filters} activeCount={activeCount} onChange={setFilters} onClear={clearFilters} />
        </div>
        <div className={styles.results}>
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
