import { useEffect, useRef } from 'react'
import type { BookDto } from '@library/shared'
import { EmptyState, ShelfMark } from '../../components/EmptyState/EmptyState'
import { ErrorMessage } from '../../components/ErrorMessage/ErrorMessage'
import { BookCard } from '../books/BookCard'
import { useRevealOnScroll } from '../../hooks/useRevealOnScroll'
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

function SkeletonCard() {
  return (
    <div className={styles.skeletonCard}>
      <div className={`${styles.skel} ${styles.skelCover}`} />
      <div className={`${styles.skel} ${styles.skelTitle}`} />
      <div className={`${styles.skel} ${styles.skelMeta}`} />
    </div>
  )
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
  const revealRef = useRevealOnScroll()

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
    // The skeleton only becomes visible after 150ms (CSS), so fast loads never flash it.
    return (
      <div className={`${styles.grid} ${styles.delayed}`} aria-busy="true" aria-label="Loading books">
        {Array.from({ length: 12 }, (_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (error && books.length === 0) return <ErrorMessage error={error} onRetry={onRetry} />

  if (books.length === 0) {
    return (
      <EmptyState
        mark={<ShelfMark />}
        title="No books match your filters"
        description="Try a different search or remove some filters."
        action={
          <button type="button" className="btn btn-primary" onClick={onClearFilters}>
            Clear filters
          </button>
        }
      />
    )
  }

  return (
    <div aria-busy={isRefreshing}>
      <div className={`${styles.grid} ${isRefreshing ? styles.refreshing : ''}`}>
        {books.map((book, index) => (
          <BookCard key={book.id} book={book} index={index} revealRef={revealRef} />
        ))}
      </div>
      {isFetchingNextPage && (
        <>
          <div className={`${styles.grid} ${styles.moreSkeletons}`} aria-hidden="true">
            {Array.from({ length: 4 }, (_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          <p role="status" className={styles.loadingMore}>
            <span className={styles.spinner} aria-hidden="true" />
            Loading more books…
          </p>
        </>
      )}
      {error ? <ErrorMessage error={error} onRetry={fetchNextPage} /> : null}
      <div ref={sentinel} className={styles.footer}>
        {hasNextPage && !isFetchingNextPage && (
          <>
            <p className={styles.shown}>
              Showing {books.length} of {total}
            </p>
            <button type="button" className="btn btn-secondary" onClick={fetchNextPage}>
              Load more books
            </button>
            <p className={styles.hint}>More books load as you scroll; the button is the fallback.</p>
          </>
        )}
      </div>
    </div>
  )
}
