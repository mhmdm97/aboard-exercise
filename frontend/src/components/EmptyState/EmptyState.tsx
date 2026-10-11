import type { ReactNode } from 'react'
import styles from './EmptyState.module.css'

interface Props {
  title: string
  description?: string
  action?: ReactNode
  /** Decorative mark above the title (an icon, or a big "404"). Hidden from assistive tech. */
  mark?: ReactNode
  /** Heading level: 1 when the state is the whole page (404, 403), 2 when it sits under a page heading. */
  level?: 1 | 2
}

export function EmptyState({ title, description, action, mark, level = 2 }: Props) {
  const Heading = level === 1 ? 'h1' : 'h2'
  return (
    <div className={styles.empty}>
      {mark && (
        <div className={styles.mark} aria-hidden="true">
          {mark}
        </div>
      )}
      <Heading className={level === 1 ? `${styles.title} ${styles.page}` : styles.title}>{title}</Heading>
      {description && <p className={styles.description}>{description}</p>}
      {action && <div className={styles.actions}>{action}</div>}
    </div>
  )
}

/** Decorative watermark numeral. Drawn with generated content so it is not text (it is deliberately low contrast). */
export function BigNumberMark({ children }: { children: string }) {
  return <span className={styles.big} data-text={children} />
}

export function CircleMark({ children }: { children: ReactNode }) {
  return <span className={styles.circle}>{children}</span>
}

/** Small empty bookshelf: a few spines, one leaning, and a gap. Colours come from tokens so it follows the theme. */
export function ShelfMark({ heart = false }: { heart?: boolean }) {
  return (
    <svg className={styles.shelf} width="150" height="120" viewBox="0 0 120 96" fill="none" aria-hidden="true">
      <rect className={styles.book} x="14" y="34" width="12" height="46" rx="1.5" style={{ fill: 'var(--surface-2)', stroke: 'var(--line-strong)' }} />
      <rect className={styles.book} x="29" y="24" width="14" height="56" rx="1.5" style={{ fill: 'var(--accent-soft)', stroke: 'var(--accent)' }} />
      <rect className={styles.book} x="46" y="40" width="11" height="40" rx="1.5" style={{ fill: 'var(--surface-2)', stroke: 'var(--line-strong)' }} />
      <rect
        className={styles.lean}
        x="86"
        y="31"
        width="13"
        height="49"
        rx="1.5"
        transform="rotate(14 99 80)"
        style={{ fill: 'var(--surface)', stroke: 'var(--ink-2)' }}
      />
      <path className={styles.book} d="M33 40h6M33 46h6" style={{ stroke: 'var(--accent)' }} strokeWidth="1.5" strokeLinecap="round" />
      {heart ? (
        <path
          className={styles.book}
          d="M71 62s-8-4.8-8-10.4a4.4 4.4 0 0 1 8-2.5 4.4 4.4 0 0 1 8 2.5C79 57.2 71 62 71 62Z"
          style={{ stroke: 'var(--accent)' }}
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />
      ) : (
        <path className={styles.book} d="M66 72h10" style={{ stroke: 'var(--line-strong)' }} strokeWidth="1.5" strokeLinecap="round" strokeDasharray="1 4" />
      )}
      <path d="M6 82h108" style={{ stroke: 'var(--ink)' }} strokeWidth="2" strokeLinecap="round" />
      <path d="M10 87h100" style={{ stroke: 'var(--line)' }} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
