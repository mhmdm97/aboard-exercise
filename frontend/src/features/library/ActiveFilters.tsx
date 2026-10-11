import { useEffect, useState } from 'react'
import type { BookFilters } from '../books/api'
import type { ActiveChip } from './activeChips'
import styles from './ActiveFilters.module.css'

interface Props {
  chips: ActiveChip[]
  onRemove: (patch: Partial<BookFilters>) => void
}

interface Shown extends ActiveChip {
  leaving: boolean
}

const LEAVE_MS = 250 // = --dur-base

/** Current chips in their old positions, removed ones kept (flagged) until their exit animation ends. */
function merge(shown: Shown[], chips: ActiveChip[]): Shown[] {
  const next = new Map(chips.map((c) => [c.key, c]))
  const kept = shown.map((s): Shown => {
    const fresh = next.get(s.key)
    return fresh ? { ...fresh, leaving: false } : { ...s, leaving: true }
  })
  const known = new Set(shown.map((s) => s.key))
  return [...kept, ...chips.filter((c) => !known.has(c.key)).map((c): Shown => ({ ...c, leaving: false }))]
}

/** Removable chips for the active filters; they scale in on add and shrink away on removal. */
export function ActiveFilters({ chips, onRemove }: Props) {
  const signature = chips.map((c) => `${c.key}=${c.label}`).join('|')
  const [shown, setShown] = useState<Shown[]>(() => merge([], chips))
  const [prevSignature, setPrevSignature] = useState(signature)

  // Derive during render (like the search box) so there is no frame with stale chips.
  if (signature !== prevSignature) {
    setPrevSignature(signature)
    setShown(merge(shown, chips))
  }

  const hasLeaving = shown.some((s) => s.leaving)
  useEffect(() => {
    if (!hasLeaving) return
    const timer = setTimeout(() => setShown((s) => s.filter((c) => !c.leaving)), LEAVE_MS)
    return () => clearTimeout(timer)
  }, [hasLeaving, signature])

  if (shown.length === 0) return null
  return (
    <ul className={styles.list} aria-label="Active filters">
      {shown.map((chip) => (
        <li key={chip.key} className={chip.leaving ? `${styles.item} ${styles.leaving}` : styles.item}>
          <button
            type="button"
            className={`chip chip-filter ${styles.chip}`}
            aria-label={`Remove filter ${chip.label}`}
            tabIndex={chip.leaving ? -1 : undefined}
            disabled={chip.leaving}
            onClick={() => onRemove(chip.remove)}
          >
            {chip.label}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </li>
      ))}
    </ul>
  )
}
