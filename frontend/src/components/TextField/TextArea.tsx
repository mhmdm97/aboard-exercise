import { useId } from 'react'
import type { ComponentProps } from 'react'
import styles from './TextField.module.css'

interface Props extends ComponentProps<'textarea'> {
  label: string
  error?: string
  hint?: string
}

/** Labelled textarea with an inline error; same look and a11y wiring as `TextField`. */
export function TextArea({ label, error, hint, className, ...input }: Props) {
  const id = useId()
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <textarea
        {...input}
        id={id}
        className={className ? `input ${styles.input} ${className}` : `input ${styles.input}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
      />
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  )
}
