import { useEffect, useRef } from 'react'
import type { BookDto } from '@library/shared'
import { EmptyState } from '../../components/EmptyState/EmptyState'
import { ErrorMessage } from '../../components/ErrorMessage/ErrorMessage'
import { Spinner } from '../../components/Spinner/Spinner'
import { BookCard } from '../books/BookCard'
import styles from './BookGrid.module.css'

interface Props {
  books: BookDto[]
  total: number
  isLoading: boolean
  isRefreshing: boolean
  error: unknown
  onRetry: () => void
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => void
  onClearFilters: () => void
}

export function BookGrid({
  books,
  total,
  isLoading,
  isRefreshing,
  error,
  onRetry,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  onClearFilters,
}: Props) {
  const sentinel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = sentinel.current
    if (!node || !hasNextPage || isFetchingNextPage || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) fetchNextPage()
      },
      { rootMargin: '400px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  if (isLoading) {
    return (
      <div className={styles.grid} aria-busy="true" aria-label="Loading books">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className={styles.skeleton} aria-hidden="true" />
        ))}
      </div>
    )
  }

  if (error && books.length === 0) return <ErrorMessage error={error} onRetry={onRetry} />

  if (books.length === 0) {
    return (
      <EmptyState
        title="No books match your filters"
        description="Try a different search or remove some filters."
        action={
          <button type="button" className="button" onClick={onClearFilters}>
            Clear filters
          </button>
        }
      />
    )
  }

  return (
    <div aria-busy={isRefreshing}>
      <p className={styles.count} aria-live="polite">
        {total} {total === 1 ? 'book' : 'books'}
      </p>
      <div className={`${styles.grid} ${isRefreshing ? styles.refreshing : ''}`}>
        {books.map((book) => (
          <BookCard key={book.id} book={book} />
        ))}
      </div>
      {error ? <ErrorMessage error={error} onRetry={fetchNextPage} /> : null}
      <div ref={sentinel} className={styles.footer}>
        {isFetchingNextPage && <Spinner label="Loading more books…" />}
        {hasNextPage && !isFetchingNextPage && (
          <button type="button" className="button" onClick={fetchNextPage}>
            Load more
          </button>
        )}
      </div>
    </div>
  )
}
