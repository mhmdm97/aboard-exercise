import { Link, useParams } from 'react-router'
import { ApiError } from '../../api/client'
import { EmptyState } from '../../components/EmptyState/EmptyState'
import { ErrorMessage } from '../../components/ErrorMessage/ErrorMessage'
import { Spinner } from '../../components/Spinner/Spinner'
import { useBook } from './api'
import { BookForm } from './BookForm'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'

function EditBook({ id }: { id: string }) {
  const { data: book, isPending, error, refetch } = useBook(id)
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
  return <BookForm book={book} />
}

/** `/books/new` and `/books/:id/edit` (admin only; guarded in `routes.tsx`). */
export function BookFormPage() {
  const { id } = useParams()
  useDocumentTitle(id ? 'Edit book' : 'New book')
  return (
    <section>
      <h1>{id ? 'Edit book' : 'New book'}</h1>
      {id ? <EditBook id={id} /> : <BookForm />}
    </section>
  )
}
