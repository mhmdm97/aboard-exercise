import { useEffect, useRef, useState } from 'react'
import styles from './SearchBar.module.css'

interface Props {
  q: string
  onChange: (q: string) => void
  delay?: number
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

export function SearchBar({ q, onChange, delay = 300 }: Props) {
  const [value, setValue] = useState(q)
  const [prevQ, setPrevQ] = useState(q)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const input = useRef<HTMLInputElement>(null)

  // Sync when the URL changes from elsewhere (clear filters, back button).
  if (q !== prevQ) {
    setPrevQ(q)
    if (q !== value.trim()) setValue(q)
  }

  useEffect(() => () => clearTimeout(timer.current), [])

  // "/" jumps to the search box, as the hint inside it promises.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target)) return
      e.preventDefault()
      input.current?.focus()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  function update(next: string) {
    setValue(next)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => onChange(next.trim()), delay)
  }

  function clear() {
    clearTimeout(timer.current)
    setValue('')
    onChange('')
    input.current?.focus()
  }

  return (
    <div className={styles.search} role="search">
      <label htmlFor="book-search" className="visually-hidden">
        Search books
      </label>
      <svg className={styles.icon} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        ref={input}
        id="book-search"
        type="search"
        className={`input ${styles.input}`}
        placeholder="Search by title or author"
        value={value}
        onChange={(e) => update(e.target.value)}
      />
      {value ? (
        <button type="button" className={styles.clear} onClick={clear} aria-label="Clear search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      ) : (
        <span className={styles.kbd} aria-hidden="true">
          /
        </span>
      )}
    </div>
  )
}
