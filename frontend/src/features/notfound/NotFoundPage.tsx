import { Link } from 'react-router'
import { BigNumberMark, EmptyState } from '../../components/EmptyState/EmptyState'
import { ArrowLeftIcon } from '../../components/icons'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'

export function NotFoundPage() {
  useDocumentTitle('Page not found')
  return (
    <EmptyState
      level={1}
      mark={<BigNumberMark>404</BigNumberMark>}
      title="Page not found"
      description="The page you are looking for does not exist."
      action={
        <Link to="/" className="btn btn-secondary">
          <ArrowLeftIcon />
          Back to library
        </Link>
      }
    />
  )
}
