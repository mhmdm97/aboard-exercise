import { Link } from 'react-router'
import { EmptyState } from '../../components/EmptyState/EmptyState'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'

export function NotFoundPage() {
  useDocumentTitle('Page not found')
  return (
    <EmptyState
      title="Page not found"
      description="The page you are looking for does not exist."
      action={<Link to="/">Back to the library</Link>}
    />
  )
}
