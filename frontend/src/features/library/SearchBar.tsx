import { useEffect, useRef, useState } from 'react'
import styles from './SearchBar.module.css'

interface Props {
  q: string
  onChange: (q: string) => void
  delay?: number
}

export function SearchBar({ q, onChange, delay = 300 }: Props) {
  const [value, setValue] = useState(q)
  const [prevQ, setPrevQ] = useState(q)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Sync when the URL changes from elsewhere (clear filters, back button).
  if (q !== prevQ) {
    setPrevQ(q)
    if (q !== value.trim()) setValue(q)
  }

  useEffect(() => () => clearTimeout(timer.current), [])

  function update(next: string) {
    setValue(next)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => onChange(next.trim()), delay)
  }

  function clear() {
    clearTimeout(timer.current)
    setValue('')
    onChange('')
  }

  return (
    <div className={styles.search}>
      <label htmlFor="book-search" className="visually-hidden">
        Search books
      </label>
      <input
        id="book-search"
        type="search"
        className={styles.input}
        placeholder="Search by title or author"
        value={value}
        onChange={(e) => update(e.target.value)}
      />
      {value && (
        <button type="button" className={styles.clear} onClick={clear} aria-label="Clear search">
          ×
        </button>
      )}
    </div>
  )
}
