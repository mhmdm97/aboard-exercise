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
