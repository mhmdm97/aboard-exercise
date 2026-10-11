import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { BookFilters } from '../books/api'
import { FilterFields } from './FilterFields'
import styles from './FilterDrawer.module.css'

interface Props {
  filters: BookFilters
  activeCount: number
  total: number
  canClear: boolean
  onChange: (patch: Partial<BookFilters>) => void
  onClear: () => void
}

/** Must match the drawer's closing animation in the CSS module. */
const CLOSE_MS = 250 // = --dur-base (drawerOut)
const DESKTOP_QUERY = '(min-width: 768px)'

/**
 * Mobile filter drawer (< 768px): a trigger button plus a modal dialog rendered in a portal.
 * While open, the app root is `inert` (no focus or clicks behind it), Escape / backdrop / close
 * button dismiss it, and focus returns to the trigger.
 */
export function FilterDrawer({ filters, activeCount, total, canClear, onChange, onClear }: Props) {
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const titleId = useId()
  const visible = open && !closing

  useEffect(() => {
    if (!open) return
    if (closing) {
      // The root is no longer inert at this point (the previous effect cleaned up), so focus can move back.
      trigger.current?.focus()
      const timer = setTimeout(() => {
        setOpen(false)
        setClosing(false)
      }, CLOSE_MS)
      return () => clearTimeout(timer)
    }
    const root = document.getElementById('root')
    root?.setAttribute('inert', '')
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    heading.current?.focus()
    return () => {
      root?.removeAttribute('inert')
      document.body.style.overflow = previousOverflow
    }
  }, [open, closing])

  useEffect(() => {
    if (!visible) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setClosing(true)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [visible])

  // Growing past the breakpoint swaps to the sidebar, so the drawer must not stay open.
  useEffect(() => {
    if (!open || typeof window.matchMedia !== 'function') return
    const query = window.matchMedia(DESKTOP_QUERY)
    const onChangeQuery = () => {
      if (query.matches) {
        setOpen(false)
        setClosing(false)
      }
    }
    query.addEventListener('change', onChangeQuery)
    return () => query.removeEventListener('change', onChangeQuery)
  }, [open])

  const close = () => setClosing(true)

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={`btn btn-secondary ${styles.trigger}`}
        aria-haspopup="dialog"
        aria-expanded={visible}
        onClick={() => {
          setClosing(false)
          setOpen(true)
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
          <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
          <circle cx="16" cy="7" r="2" />
          <circle cx="10" cy="17" r="2" />
        </svg>
        Filters
        {activeCount > 0 && <span className={styles.count}>{activeCount}</span>}
      </button>

      {open &&
        createPortal(
          <div className={closing ? `${styles.layer} ${styles.closing}` : styles.layer}>
            <div className={styles.backdrop} onClick={close} aria-hidden="true" />
            <div className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby={titleId}>
              <div className={styles.head}>
                <h2 id={titleId} ref={heading} tabIndex={-1} className={styles.title}>
                  Filters
                </h2>
                <button type="button" className="btn btn-ghost btn-icon" aria-label="Close filters" onClick={close}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              </div>
              <div className={styles.body}>
                <FilterFields filters={filters} onChange={onChange} />
              </div>
              <div className={styles.foot}>
                <button type="button" className={`btn btn-secondary ${styles.clear}`} disabled={!canClear} onClick={onClear}>
                  Clear
                </button>
                <button type="button" className={`btn btn-primary ${styles.show}`} onClick={close}>
                  Show {total} {total === 1 ? 'book' : 'books'}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
