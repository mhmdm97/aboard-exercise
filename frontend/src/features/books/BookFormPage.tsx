import { Link, useParams } from 'react-router'
import { ApiError } from '../../api/client'
import { BigNumberMark, EmptyState } from '../../components/EmptyState/EmptyState'
import { ErrorMessage } from '../../components/ErrorMessage/ErrorMessage'
import { ArrowLeftIcon } from '../../components/icons'
import { Spinner } from '../../components/Spinner/Spinner'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { canViewTransition } from '../../hooks/viewTransition'
import { useBook } from './api'
import { BookForm } from './BookForm'
import styles from './BookFormPage.module.css'

function EditBook({ id }: { id: string }) {
  const { data: book, isPending, error, refetch } = useBook(id)
  if (isPending) return <Spinner label="Loading book…" />
  if (error instanceof ApiError && error.status === 404) {
    return (
      <EmptyState
        level={2}
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
  return <BookForm book={book} />
}

/** `/books/new` and `/books/:id/edit` (admin only; guarded in `routes.tsx`). */
export function BookFormPage() {
  const { id } = useParams()
  useDocumentTitle(id ? 'Edit book' : 'New book')
  return (
    <section>
      <Link to={id ? `/books/${id}` : '/'} className={styles.back} viewTransition={canViewTransition()}>
        <ArrowLeftIcon />
        {id ? 'Back to book' : 'Back to library'}
      </Link>
      <h1 className={styles.title}>{id ? 'Edit book' : 'Add a book'}</h1>
      {id ? <EditBook id={id} /> : <BookForm />}
    </section>
  )
}
