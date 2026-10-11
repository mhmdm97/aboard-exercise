import type { ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import type { UserRole } from '@library/shared'
import { useCurrentUser } from '../../features/auth/api'
import { CircleMark, EmptyState } from '../EmptyState/EmptyState'
import { ErrorMessage } from '../ErrorMessage/ErrorMessage'
import { LockIcon } from '../icons'
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
        level={1}
        mark={
          <CircleMark>
            <LockIcon />
          </CircleMark>
        }
        title="You don't have access"
        description={`Only ${role}s can use this page. You're logged in as a ${user.role}.`}
        action={
          <>
            <Link to="/" className="btn btn-secondary">
              Back to library
            </Link>
            <Link to="/login" className="btn btn-primary">
              Switch account
            </Link>
          </>
        }
      />
    )
  }
  return children
}

export function RequireRole({ role, children }: { role: UserRole; children: ReactNode }) {
  return <RequireAuth role={role}>{children}</RequireAuth>
}
