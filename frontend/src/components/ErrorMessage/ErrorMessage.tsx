import styles from './ErrorMessage.module.css'

interface Props {
  error: unknown
  onRetry?: () => void
}

export function ErrorMessage({ error, onRetry }: Props) {
  // ApiError extends Error, so its message is shown as-is.
  const message = error instanceof Error ? error.message : 'Something went wrong.'
  return (
    <div className={styles.error} role="alert">
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="btn btn-secondary" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}
