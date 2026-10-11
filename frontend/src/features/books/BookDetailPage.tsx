import { Fragment, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { ApiError } from '../../api/client'
import { ConfirmDialog } from '../../components/ConfirmDialog/ConfirmDialog'
import { BigNumberMark, EmptyState } from '../../components/EmptyState/EmptyState'
import { ErrorMessage } from '../../components/ErrorMessage/ErrorMessage'
import { ArrowLeftIcon, PencilIcon, TrashIcon } from '../../components/icons'
import { Spinner } from '../../components/Spinner/Spinner'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { canViewTransition, useGoBack } from '../../hooks/viewTransition'
import { useCurrentUser } from '../auth/api'
import { FavouriteButton } from '../favourites/FavouriteButton'
import { useBook, useDeleteBook } from './api'
import { Cover } from './Cover'
import styles from './BookDetailPage.module.css'

function BackLink({ bookId }: { bookId: string }) {
  const location = useLocation()
  const goBack = useGoBack(bookId)
  // "default" key = first entry in this session, so there is nothing to go back to.
  return (
    <Link
      to="/"
      className={styles.back}
      viewTransition={canViewTransition()}
      onClick={(e) => {
        if (location.key !== 'default') {
          e.preventDefault()
          goBack()
        }
      }}
    >
      <ArrowLeftIcon />
      Back to library
    </Link>
  )
}

/** Five stars, each filled when the rating reaches it (a quarter star of slack). Decorative; the number carries the meaning. */
function Stars({ rating }: { rating: number }) {
  return (
    <span className={styles.stars} aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} width="20" height="20" viewBox="0 0 24 24">
          <path
            d="m12 3.5 2.6 5.5 6 .7-4.5 4.1 1.2 5.9L12 16.8l-5.3 2.9 1.2-5.9-4.5-4.1 6-.7Z"
            fill={rating >= n - 0.25 ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      ))}
    </span>
  )
}

function Fact({ label, value, mono = false }: { label: string; value: string | number | null; mono?: boolean }) {
  return (
    <div>
      <dt>{label}</dt>
      {value === null ? (
        <dd className={styles.missing}>Not recorded</dd>
      ) : (
        <dd className={mono ? styles.mono : undefined}>{value}</dd>
      )}
    </div>
  )
}

export function BookDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { data: user } = useCurrentUser()
  const { data: book, isPending, error, refetch } = useBook(id, { showCachedFirst: true })
  const deleteBook = useDeleteBook(id)
  useDocumentTitle(book?.title ?? 'Book')
  const [confirming, setConfirming] = useState(false)

  if (isPending) return <Spinner label="Loading book…" />

  if (error instanceof ApiError && error.status === 404) {
    return (
      <EmptyState
        level={1}
        mark={<BigNumberMark>404</BigNumberMark>}
        title="Book not found"
        description="It may have been removed from the library, or the link is mistyped."
        action={
          <Link to="/" className="btn btn-secondary">
            <ArrowLeftIcon />
            Back to library
          </Link>
        }
      />
    )
  }
  if (error) return <ErrorMessage error={error} onRetry={() => void refetch()} />

  const isAdmin = user?.role === 'admin'
  const rating = book.averageRating
  const confirmDelete = () =>
    deleteBook.mutate(undefined, {
      onSuccess: () =>
        void navigate('/', { state: { message: `"${book.title}" was deleted.` }, viewTransition: canViewTransition() }),
    })

  return (
    <div className={styles.page}>
      <BackLink bookId={book.id} />
      <div className={styles.layout}>
        <div className={styles.coverCol}>
          <div className={styles.cover}>
            <Cover book={book} priority morph />
          </div>
          <div className={styles.shadow} aria-hidden="true" />
          <div className={styles.mobileSummary} aria-hidden="true">
            {rating !== null && (
              <>
                <Stars rating={rating} />
                <span>
                  <strong>{rating.toFixed(1)}</strong> / 5
                </span>
              </>
            )}
            <span className={styles.summaryMeta}>
              {[book.publishedYear, book.pageCount !== null ? `${book.pageCount} pages` : null]
                .filter((v) => v !== null)
                .join(' · ')}
            </span>
          </div>
        </div>

        <article className={styles.info}>
          {book.genres.length > 0 && (
            <ul className={styles.genres} aria-label="Genres">
              {book.genres.map((g) => (
                <li key={g.id}>
                  <Link to={`/?genre=${encodeURIComponent(g.slug)}`} className="chip">
                    {g.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className={styles.heading}>
            <h1 className={styles.title}>{book.title}</h1>
            {book.subtitle && <p className={styles.subtitle}>{book.subtitle}</p>}
            {book.authors.length > 0 && (
              <p className={styles.authors}>
                by{' '}
                {book.authors.map((a, i) => (
                  <Fragment key={a.id}>
                    {i > 0 && ', '}
                    <Link to={`/?author=${encodeURIComponent(a.id)}`}>{a.name}</Link>
                  </Fragment>
                ))}
              </p>
            )}
          </div>

          <div className={styles.rating}>
            {rating !== null ? (
              <>
                <Stars rating={rating} />
                <strong className={styles.ratingNumber}>{rating.toFixed(1)}</strong>
                <span className={styles.ratingOf}>out of 5</span>
              </>
            ) : (
              <span className={styles.ratingOf}>Not rated</span>
            )}
          </div>

          <div className={styles.actions}>
            <FavouriteButton bookId={book.id} title={book.title} variant="full" />
            {isAdmin && (
              <>
                <span className={styles.spacer} />
                <Link to={`/books/${book.id}/edit`} className="btn btn-secondary" viewTransition={canViewTransition()}>
                  <PencilIcon />
                  Edit
                </Link>
                <button type="button" className="btn btn-danger-outline" onClick={() => setConfirming(true)}>
                  <TrashIcon />
                  Delete
                </button>
              </>
            )}
          </div>

          <dl className={styles.facts}>
            <Fact label="Published" value={book.publishedYear} />
            <Fact label="Pages" value={book.pageCount} />
            <Fact label="ISBN" value={book.isbn} mono />
            <Fact label="Rating" value={rating !== null ? `${rating.toFixed(1)} / 5` : null} />
          </dl>

          {book.description && (
            <section className={styles.about} aria-labelledby="about-heading">
              <h2 id="about-heading">About this book</h2>
              <p>{book.description}</p>
            </section>
          )}
        </article>
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
            "{book.title}" will be permanently removed from the library and from everyone's favourites. This cannot be
            undone.
          </p>
        </ConfirmDialog>
      )}
    </div>
  )
}
