import type { ReactNode } from 'react'
import styles from './EmptyState.module.css'

interface Props {
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ title, description, action }: Props) {
  return (
    <div className={styles.empty}>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {action}
    </div>
  )
}
