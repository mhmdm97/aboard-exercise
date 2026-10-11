import type { BookFilters } from '../books/api'
import { FilterFields } from './FilterFields'
import styles from './FilterPanel.module.css'

interface Props {
  filters: BookFilters
  /** True when anything (filters or search text) can be cleared. */
  canClear: boolean
  onChange: (patch: Partial<BookFilters>) => void
  onClear: () => void
}

/** Desktop filter sidebar. Below 768px it is hidden and the drawer takes over. */
export function FilterPanel({ filters, canClear, onChange, onClear }: Props) {
  return (
    <aside className={styles.panel} aria-label="Filters">
      <div className={styles.head}>
        <h2 className={styles.title}>Filters</h2>
        {canClear && (
          <button type="button" className="btn-link" onClick={onClear}>
            Clear filters
          </button>
        )}
      </div>
      <FilterFields filters={filters} onChange={onChange} />
    </aside>
  )
}
