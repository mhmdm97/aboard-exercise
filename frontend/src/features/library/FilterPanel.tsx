import { useId, useState } from 'react'
import type { BookSort } from '@library/shared'
import { useGenres, type BookFilters } from '../books/api'
import styles from './FilterPanel.module.css'

interface Props {
  filters: BookFilters
  activeCount: number
  onChange: (patch: Partial<BookFilters>) => void
  onClear: () => void
}

const RATINGS = [3, 3.5, 4, 4.5]
const SORTS: { value: BookSort; label: string }[] = [
  { value: 'title', label: 'Title' },
  { value: 'year', label: 'Year' },
  { value: 'rating', label: 'Rating' },
  { value: 'newest', label: 'Recently added' },
]

function YearInput({
  label,
  value,
  onCommit,
}: {
  label: string
  value?: number
  onCommit: (v: number | undefined) => void
}) {
  const commit = (raw: string) => {
    const n = raw.trim() === '' ? undefined : Number(raw)
    const next = n !== undefined && Number.isFinite(n) ? Math.trunc(n) : undefined
    if (next !== value) onCommit(next)
  }
  return (
    <label className={styles.field}>
      <span>{label}</span>
      {/* Uncontrolled and keyed on the URL value: commits on blur/Enter, resets on clear. */}
      <input
        key={value ?? ''}
        type="number"
        inputMode="numeric"
        defaultValue={value ?? ''}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit(e.currentTarget.value)
        }}
      />
    </label>
  )
}

export function FilterPanel({ filters, activeCount, onChange, onClear }: Props) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const genres = useGenres()

  function toggleGenre(slug: string) {
    const next = filters.genres.includes(slug)
      ? filters.genres.filter((g) => g !== slug)
      : [...filters.genres, slug]
    onChange({ genres: next })
  }

  const order = filters.order ?? 'asc'

  return (
    <aside className={styles.wrapper} aria-label="Filters">
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        Filters{activeCount > 0 && <span className={styles.badge}>{activeCount}</span>}
      </button>

      <div id={panelId} className={`${styles.panel} ${open ? styles.open : ''}`}>
        <fieldset className={styles.group}>
          <legend>Genre</legend>
          {genres.isPending && <p className={styles.hint}>Loading genres…</p>}
          {genres.isError && <p className={styles.hint}>Could not load genres.</p>}
          <div className={styles.chips}>
            {genres.data?.map((g) => (
              <label key={g.id} className={styles.chip}>
                <input
                  type="checkbox"
                  checked={filters.genres.includes(g.slug)}
                  onChange={() => toggleGenre(g.slug)}
                />
                <span>{g.name}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className={styles.group}>
          <legend>Published year</legend>
          <div className={styles.row}>
            <YearInput label="From" value={filters.yearFrom} onCommit={(v) => onChange({ yearFrom: v })} />
            <YearInput label="To" value={filters.yearTo} onCommit={(v) => onChange({ yearTo: v })} />
          </div>
        </fieldset>

        <label className={styles.field}>
          <span>Minimum rating</span>
          <select
            value={filters.minRating ?? ''}
            onChange={(e) => onChange({ minRating: e.target.value === '' ? undefined : Number(e.target.value) })}
          >
            <option value="">Any</option>
            {RATINGS.map((r) => (
              <option key={r} value={r}>
                {r}+
              </option>
            ))}
          </select>
        </label>

        <div className={styles.field}>
          <label htmlFor={`${panelId}-sort`}>Sort by</label>
          <div className={styles.row}>
            <select
              id={`${panelId}-sort`}
              value={filters.sort ?? ''}
              onChange={(e) => {
                const sort = e.target.value === '' ? undefined : (e.target.value as BookSort)
                onChange({ sort, order: sort ? filters.order : undefined })
              }}
            >
              <option value="">Default</option>
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={styles.order}
              disabled={!filters.sort}
              aria-label={order === 'asc' ? 'Ascending order' : 'Descending order'}
              onClick={() => onChange({ order: order === 'asc' ? 'desc' : 'asc' })}
            >
              {order === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>

        <button
          type="button"
          className={styles.clearAll}
          onClick={onClear}
          disabled={activeCount === 0 && !filters.q}
        >
          Clear filters
        </button>
      </div>
    </aside>
  )
}
