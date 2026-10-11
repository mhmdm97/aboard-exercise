import styles from './ErrorMessage.module.css'

interface Props {
  error: unknown
  onRetry?: () => void
  title?: string
}

export function ErrorMessage({ error, onRetry, title = 'Something went wrong' }: Props) {
  // ApiError extends Error, so its message is shown as-is.
  const message = error instanceof Error ? error.message : 'Something went wrong.'
  return (
    <div className={styles.error} role="alert">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className={styles.icon}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.5v5.5M12 16.5v.01" />
      </svg>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.message}>{message}</p>
      {onRetry && (
        <button type="button" className="btn btn-primary" onClick={onRetry}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" />
          </svg>
          Try again
        </button>
      )}
    </div>
  )
}
