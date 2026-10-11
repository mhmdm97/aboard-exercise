import { Link } from 'react-router'
import { EmptyState } from '../../components/EmptyState/EmptyState'
import { ErrorMessage } from '../../components/ErrorMessage/ErrorMessage'
import { Spinner } from '../../components/Spinner/Spinner'
import { BookCard } from '../books/BookCard'
import gridStyles from '../library/BookGrid.module.css'
import { useFavourites } from './api'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'

export function FavouritesPage() {
  useDocumentTitle('Favourites')
  const { data: books, isPending, error, refetch } = useFavourites()

  return (
    <section>
      <h1>Favourites</h1>
      {isPending ? (
        <Spinner label="Loading favourites…" />
      ) : error ? (
        <ErrorMessage error={error} onRetry={() => void refetch()} />
      ) : books.length === 0 ? (
        <EmptyState
          title="No favourites yet"
          description="Tap the heart on a book to save it here."
          action={<Link to="/">Browse the library</Link>}
        />
      ) : (
        <div className={gridStyles.grid}>
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </section>
  )
}
