import { Link } from 'react-router'
import { EmptyState, ShelfMark } from '../../components/EmptyState/EmptyState'
import { ErrorMessage } from '../../components/ErrorMessage/ErrorMessage'
import { Spinner } from '../../components/Spinner/Spinner'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { useRevealOnScroll } from '../../hooks/useRevealOnScroll'
import { canViewTransition } from '../../hooks/viewTransition'
import { BookCard } from '../books/BookCard'
import gridStyles from '../library/BookGrid.module.css'
import { useFavourites } from './api'
import styles from './FavouritesPage.module.css'

export function FavouritesPage() {
  useDocumentTitle('Favourites')
  const { data: books, isPending, error, refetch } = useFavourites()
  const revealRef = useRevealOnScroll()

  return (
    <section>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Favourites</h1>
          {books && books.length > 0 && (
            <p className={styles.count}>
              {books.length} {books.length === 1 ? 'book' : 'books'} you've saved
            </p>
          )}
        </div>
        {books && books.length > 0 && (
          <Link to="/" className={`btn btn-secondary ${styles.browse}`} viewTransition={canViewTransition()}>
            Browse the library
          </Link>
        )}
      </div>
      {isPending ? (
        <Spinner label="Loading favourites…" />
      ) : error ? (
        <ErrorMessage error={error} onRetry={() => void refetch()} />
      ) : books.length === 0 ? (
        <EmptyState
          mark={<ShelfMark heart />}
          title="Nothing saved yet"
          description="Tap the heart on any book and it will wait for you here."
          action={
            <Link to="/" className="btn btn-primary" viewTransition={canViewTransition()}>
              Browse the library
            </Link>
          }
        />
      ) : (
        <div className={gridStyles.grid}>
          {books.map((book, i) => (
            <BookCard key={book.id} book={book} index={i} revealRef={revealRef} />
          ))}
        </div>
      )}
    </section>
  )
}
