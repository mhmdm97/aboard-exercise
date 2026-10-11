import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { ApiError } from '../../api/client'
import { ConfirmDialog } from '../../components/ConfirmDialog/ConfirmDialog'
import { EmptyState } from '../../components/EmptyState/EmptyState'
import { ErrorMessage } from '../../components/ErrorMessage/ErrorMessage'
import { Spinner } from '../../components/Spinner/Spinner'
import { useCurrentUser } from '../auth/api'
import { FavouriteButton } from '../favourites/FavouriteButton'
import { useBook, useDeleteBook } from './api'
import { Cover } from './BookCard'
import styles from './BookDetailPage.module.css'

function BackLink() {
  const navigate = useNavigate()
  const location = useLocation()
  // "default" key = first entry in this session, so there is nothing to go back to.
  return (
    <Link
      to="/"
      className={styles.back}
      onClick={(e) => {
        if (location.key !== 'default') {
          e.preventDefault()
          void navigate(-1)
        }
      }}
    >
      ← Back to the library
    </Link>
  )
}

export function BookDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { data: user } = useCurrentUser()
  const { data: book, isPending, error, refetch } = useBook(id)
  const deleteBook = useDeleteBook(id)
  const [confirming, setConfirming] = useState(false)

  if (isPending) return <Spinner label="Loading book…" />

  if (error instanceof ApiError && error.status === 404) {
    return (
      <EmptyState
        title="Book not found"
        description="It may have been removed."
        action={<Link to="/">Back to the library</Link>}
      />
    )
  }
  if (error) return <ErrorMessage error={error} onRetry={() => void refetch()} />

  const isAdmin = user?.role === 'admin'
  const confirmDelete = () =>
    deleteBook.mutate(undefined, {
      onSuccess: () => void navigate('/', { state: { message: `"${book.title}" was deleted.` } }),
    })

  return (
    <article className={styles.page}>
      <BackLink />
      <div className={styles.layout}>
        <div className={styles.cover}>
          <Cover book={book} />
        </div>
        <div className={styles.info}>
          <h1 className={styles.title}>{book.title}</h1>
          {book.subtitle && <p className={styles.subtitle}>{book.subtitle}</p>}
          {book.authors.length > 0 && (
            // Plain text: the library filters have no `author` param yet.
            <p className={styles.authors}>by {book.authors.map((a) => a.name).join(', ')}</p>
          )}
          {book.genres.length > 0 && (
            <ul className={styles.genres} aria-label="Genres">
              {book.genres.map((g) => (
                <li key={g.id}>
                  <Link to={`/?genre=${encodeURIComponent(g.slug)}`} className={styles.chip}>
                    {g.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <dl className={styles.facts}>
            {book.publishedYear !== null && (
              <div>
                <dt>Year</dt>
                <dd>{book.publishedYear}</dd>
              </div>
            )}
            {book.pageCount !== null && (
              <div>
                <dt>Pages</dt>
                <dd>{book.pageCount}</dd>
              </div>
            )}
            {book.isbn && (
              <div>
                <dt>ISBN</dt>
                <dd>{book.isbn}</dd>
              </div>
            )}
            <div>
              <dt>Rating</dt>
              <dd>{book.averageRating !== null ? `★ ${book.averageRating.toFixed(1)} / 5` : 'Not rated'}</dd>
            </div>
          </dl>
          {book.description && <p className={styles.description}>{book.description}</p>}
          <div className={styles.actions}>
            <FavouriteButton bookId={book.id} title={book.title} variant="full" />
            {isAdmin && (
              <>
                <Link to={`/books/${book.id}/edit`} className="button">
                  Edit
                </Link>
                <button type="button" className={styles.delete} onClick={() => setConfirming(true)}>
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      {isAdmin && confirming && (
        <ConfirmDialog
          title="Delete this book?"
          confirmLabel="Delete"
          pending={deleteBook.isPending}
          error={deleteBook.error?.message}
          onConfirm={confirmDelete}
          onCancel={() => setConfirming(false)}
        >
          <p>
            "{book.title}" will be permanently removed from the library. This cannot be undone.
          </p>
        </ConfirmDialog>
      )}
    </article>
  )
}
