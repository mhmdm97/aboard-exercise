import { useEffect, useState } from 'react'
import styles from './Toast.module.css'

/** How long the message stays before it leaves (the clock restarts after a hover or focus). */
const HOLD_MS = 4000
/** Must match `--dur-base` (the exit animation length). */
const EXIT_MS = 250 // = --dur-base (toast-out)

type Phase = 'shown' | 'leaving' | 'gone'

/**
 * A polite success message. The `role="status"` region is always rendered (so screen readers announce text inserted
 * into it); the card slides in, holds for 4s (paused while hovered or focused), then fades out. It can be dismissed.
 * Pass a new `message` to show another one.
 */
export function Toast({ message }: { message: string }) {
  return <ToastRegion key={message} message={message} />
}

function ToastRegion({ message }: { message: string }) {
  const [phase, setPhase] = useState<Phase>('gone')
  const [paused, setPaused] = useState(false)

  // Insert the message a moment after the (empty) live region has mounted, or screen readers would not announce it.
  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setPhase('shown'), 50)
    return () => clearTimeout(timer)
  }, [message])

  useEffect(() => {
    if (phase !== 'shown' || paused) return
    const timer = setTimeout(() => setPhase('leaving'), HOLD_MS)
    return () => clearTimeout(timer)
  }, [phase, paused])

  useEffect(() => {
    if (phase !== 'leaving') return
    const timer = setTimeout(() => setPhase('gone'), EXIT_MS)
    return () => clearTimeout(timer)
  }, [phase])

  return (
    <div role="status" className={styles.region}>
      {phase !== 'gone' && (
        <div
          className={phase === 'leaving' ? `${styles.toast} ${styles.leaving}` : styles.toast}
          onPointerEnter={() => setPaused(true)}
          onPointerLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden="true" className={styles.ok}>
            <path d="m5 12 5 5 9-10" />
          </svg>
          <span>{message}</span>
          <button type="button" className={styles.dismiss} aria-label="Dismiss message" onClick={() => setPhase('leaving')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
