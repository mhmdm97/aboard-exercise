import { useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { TrashIcon } from '../icons'
import styles from './ConfirmDialog.module.css'

interface Props {
  title: string
  children: ReactNode
  confirmLabel: string
  pending?: boolean
  error?: string | null
  onConfirm: () => void
  onCancel: () => void
}

/** Must match `--dur-fast` in index.css (the exit animation length). */
const EXIT_MS = 180 // = --dur-fast (dialog-out)

/**
 * Modal confirm built on native `<dialog>`: focus starts on Cancel; Escape, Cancel and a click on the backdrop
 * play the exit animation, then call `onCancel`. Mount it only while open.
 */
export function ConfirmDialog({ title, children, confirmLabel, pending, error, onConfirm, onCancel }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const cancelButton = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const [closing, setClosing] = useState(false)
  const cancelRef = useRef(onCancel)
  useEffect(() => {
    cancelRef.current = onCancel
  })

  useEffect(() => {
    const node = dialog.current
    if (node && !node.open) node.showModal()
    cancelButton.current?.focus()
  }, [])

  useEffect(() => {
    if (!closing) return
    const timer = setTimeout(() => cancelRef.current(), EXIT_MS)
    return () => clearTimeout(timer)
  }, [closing])

  const requestClose = () => {
    if (!pending) setClosing(true)
  }

  return (
    <dialog
      ref={dialog}
      className={closing ? `${styles.dialog} ${styles.closing}` : styles.dialog}
      aria-labelledby={titleId}
      onCancel={(e) => {
        // Escape: play the exit animation instead of closing at once.
        e.preventDefault()
        requestClose()
      }}
      onClick={(e) => {
        // Only a click on the backdrop lands on the <dialog> itself; the panel is the inner div.
        if (e.target === e.currentTarget) requestClose()
      }}
    >
      <div className={styles.body}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <div className={styles.content}>{children}</div>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <div className={styles.actions}>
          <button ref={cancelButton} type="button" className="btn btn-secondary" onClick={requestClose} disabled={pending}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={pending}>
            {pending ? <span className={styles.spinner} aria-hidden="true" /> : <TrashIcon />}
            {pending ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}
