import type { ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import type { UserRole } from '@library/shared'
import { useCurrentUser } from '../../features/auth/api'
import { EmptyState } from '../EmptyState/EmptyState'
import { ErrorMessage } from '../ErrorMessage/ErrorMessage'
import { Spinner } from '../Spinner/Spinner'

interface Props {
  /** When set, logged-in users without this role see a 403 page. */
  role?: UserRole
  children: ReactNode
}

/** Route guard: anonymous users go to login (and come back), wrong-role users get a 403 page. */
export function RequireAuth({ role, children }: Props) {
  const { data: user, isPending, error, refetch } = useCurrentUser()
  const location = useLocation()

  if (isPending) return <Spinner label="Checking your session…" />
  if (error) return <ErrorMessage error={error} onRetry={() => void refetch()} />
  if (!user) {
    const redirect = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?redirect=${redirect}`} replace />
  }
  if (role && user.role !== role) {
    return (
      <EmptyState
        title="You don't have access"
        description="Your account is not allowed to view this page."
        action={<Link to="/">Back to the library</Link>}
      />
    )
  }
  return children
}

export function RequireRole({ role, children }: { role: UserRole; children: ReactNode }) {
  return <RequireAuth role={role}>{children}</RequireAuth>
}
