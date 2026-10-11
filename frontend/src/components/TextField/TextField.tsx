import { useId } from 'react'
import type { ComponentProps, ReactNode } from 'react'
import styles from './TextField.module.css'

interface Props extends ComponentProps<'input'> {
  label: string
  error?: string
  hint?: string
  /** Control placed inside the input's right edge (e.g. a show/hide password button). */
  trailing?: ReactNode
}

/** Labelled input with an inline error. Spread react-hook-form's `register(...)` onto it. */
export function TextField({ label, error, hint, trailing, className, id: idProp, ...input }: Props) {
  const generatedId = useId()
  const id = idProp ?? generatedId
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div className={styles.control}>
        <input
          {...input}
          id={id}
          className={[`input`, styles.input, trailing ? styles.hasTrailing : '', className].filter(Boolean).join(' ')}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
        />
        {trailing}
      </div>
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className={styles.error}>
          <ErrorIcon />
          {error}
        </p>
      )}
    </div>
  )
}

export function ErrorIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden="true" className={styles.errorIcon}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5M12 16.5v.01" />
    </svg>
  )
}
