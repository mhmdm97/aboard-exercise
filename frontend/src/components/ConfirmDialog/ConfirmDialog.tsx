import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
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

/** Modal confirm built on native `<dialog>`: focus starts on Cancel and Escape cancels. Mount it only while open. */
export function ConfirmDialog({ title, children, confirmLabel, pending, error, onConfirm, onCancel }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const cancelButton = useRef<HTMLButtonElement>(null)
  const titleId = useId()

  useEffect(() => {
    const node = dialog.current
    if (node && !node.open) node.showModal()
    cancelButton.current?.focus()
  }, [])

  return (
    <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId} onClose={onCancel}>
      <h2 id={titleId} className={styles.title}>
        {title}
      </h2>
      <div>{children}</div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.actions}>
        <button ref={cancelButton} type="button" className={styles.cancel} onClick={onCancel} disabled={pending}>
          Cancel
        </button>
        <button type="button" className={styles.danger} onClick={onConfirm} disabled={pending}>
          {pending ? 'Deleting…' : confirmLabel}
        </button>
      </div>
    </dialog>
  )
}
