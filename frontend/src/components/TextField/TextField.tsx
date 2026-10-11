import { useId } from 'react'
import type { ComponentProps } from 'react'
import styles from './TextField.module.css'

interface Props extends ComponentProps<'input'> {
  label: string
  error?: string
  hint?: string
}

/** Labelled input with an inline error. Spread react-hook-form's `register(...)` onto it. */
export function TextField({ label, error, hint, className, ...input }: Props) {
  const id = useId()
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <input
        {...input}
        id={id}
        className={className ? `${styles.input} ${className}` : styles.input}
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
