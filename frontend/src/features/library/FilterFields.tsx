import { useId } from 'react'
import type { BookSort } from '@library/shared'
import { useGenres, type BookFilters } from '../books/api'
import styles from './FilterFields.module.css'

interface Props {
  filters: BookFilters
  onChange: (patch: Partial<BookFilters>) => void
}

const RATINGS = [3, 3.5, 4, 4.5]
const SORTS: { value: BookSort; label: string }[] = [
  { value: 'title', label: 'Title' },
  { value: 'year', label: 'Year' },
  { value: 'rating', label: 'Rating' },
  { value: 'newest', label: 'Recently added' },
]

const ASC_ICON = 'M7 20V4M3 8l4-4 4 4M14 6h3M14 11h5M14 16h7'
const DESC_ICON = 'M7 4v16M3 16l4 4 4-4M14 6h7M14 11h5M14 16h3'

function YearInput({
  label,
  placeholder,
  value,
  onCommit,
}: {
  label: string
  placeholder: string
  value?: number
  onCommit: (v: number | undefined) => void
}) {
  const id = useId()
  const commit = (raw: string) => {
    const n = raw.trim() === '' ? undefined : Number(raw)
    const next = n !== undefined && Number.isFinite(n) ? Math.trunc(n) : undefined
    if (next !== value) onCommit(next)
  }
  return (
    <div className={styles.field}>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      {/* Uncontrolled and keyed on the URL value: commits on blur/Enter, resets on clear. */}
      <input
        id={id}
        key={value ?? ''}
        className={`input ${styles.year}`}
        type="number"
        inputMode="numeric"
        placeholder={placeholder}
        defaultValue={value ?? ''}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit(e.currentTarget.value)
        }}
      />
    </div>
  )
}

/** The filter controls shared by the desktop sidebar and the mobile drawer. */
export function FilterFields({ filters, onChange }: Props) {
  const ratingName = useId()
  const sortId = useId()
  const genres = useGenres()

  function toggleGenre(slug: string) {
    const next = filters.genres.includes(slug)
      ? filters.genres.filter((g) => g !== slug)
      : [...filters.genres, slug]
    onChange({ genres: next })
  }

  const order = filters.order ?? 'asc'
  const orderLabel =
    order === 'asc' ? 'Ascending order, switch to descending' : 'Descending order, switch to ascending'

  return (
    <div className={styles.fields}>
      <fieldset className={styles.group}>
        <legend>Genres</legend>
        {genres.isPending && <p className={styles.hint}>Loading genres…</p>}
        {genres.isError && <p className={styles.hint}>Could not load genres.</p>}
        <div className={styles.chips}>
          {genres.data?.map((g) => {
            const on = filters.genres.includes(g.slug)
            return (
              <button
                key={g.id}
                type="button"
                className={on ? 'chip on' : 'chip'}
                aria-pressed={on}
                onClick={() => toggleGenre(g.slug)}
              >
                <svg className="tick" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden="true">
                  <path d="m5 12 5 5 9-10" />
                </svg>
                {g.name}
              </button>
            )
          })}
        </div>
      </fieldset>

      <fieldset className={styles.group}>
        <legend>Published</legend>
        <div className={styles.years}>
          <YearInput label="From" placeholder="1800" value={filters.yearFrom} onCommit={(v) => onChange({ yearFrom: v })} />
          <YearInput label="To" placeholder="2026" value={filters.yearTo} onCommit={(v) => onChange({ yearTo: v })} />
        </div>
      </fieldset>

      <fieldset className={styles.group}>
        <legend>Minimum rating</legend>
        <div className={styles.seg}>
          {[undefined, ...RATINGS].map((r) => (
            <label key={r ?? 'any'} className={filters.minRating === r ? `${styles.segItem} ${styles.segOn}` : styles.segItem}>
              <input
                type="radio"
                name={ratingName}
                className="visually-hidden"
                checked={filters.minRating === r}
                onChange={() => onChange({ minRating: r })}
              />
              {r === undefined ? 'Any' : `${r}+`}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.group}>
        <legend>Sort by</legend>
        <div className={styles.sortRow}>
          <label htmlFor={sortId} className="visually-hidden">
            Sort by
          </label>
          <select
            id={sortId}
            className="select"
            value={filters.sort ?? ''}
            onChange={(e) => {
              const sort = e.target.value === '' ? undefined : (e.target.value as BookSort)
              onChange({ sort, order: sort ? filters.order : undefined })
            }}
          >
            <option value="">Default (relevance)</option>
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-secondary btn-icon"
            disabled={!filters.sort}
            aria-label={orderLabel}
            title={orderLabel}
            onClick={() => onChange({ order: order === 'asc' ? 'desc' : 'asc' })}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
              <path d={order === 'asc' ? ASC_ICON : DESC_ICON} />
            </svg>
          </button>
        </div>
      </fieldset>
    </div>
  )
}
