import { useState } from 'react'
import type { CSSProperties } from 'react'
import type { BookDto } from '@library/shared'
import { useCoverTransitionName } from '../../hooks/viewTransition'
import { coverAuthorLabel, coverColor } from './coverStyle'
import { coverSrc } from './coverSrc'
import styles from './Cover.module.css'

/** Covers at or before this index in a list load eagerly (above the fold); the first few also get high fetch priority. */
const EAGER_COVERS = 8
const HIGH_PRIORITY_COVERS = 4

interface Props {
  book: BookDto
  /** Position in the list; omit for a lazy cover. */
  index?: number
  /** Force eager + high priority (the detail page's main cover). */
  priority?: boolean
  /** Take part in the card <-> detail shared-element transition (gets a `view-transition-name` while it runs). */
  morph?: boolean
}

/** 2:3 cover: the real image when it loads, otherwise a generated cloth-bound edition. */
export function Cover({ book, index = Infinity, priority = false, morph = false }: Props) {
  const eager = priority || index < EAGER_COVERS
  const high = priority || index < HIGH_PRIORITY_COVERS
  const [failed, setFailed] = useState(false)
  const transitionName = useCoverTransitionName(morph ? book.id : null)
  const transition = transitionName
    ? { className: styles.morphing, style: { viewTransitionName: transitionName } satisfies CSSProperties }
    : { className: '', style: undefined }

  if (!book.coverUrl || failed) {
    return (
      <div
        className={`${styles.cover} ${transition.className}`}
        style={{ '--c': coverColor(book.title), ...transition.style } as CSSProperties}
        role="img"
        aria-label={`Cover of ${book.title}`}
        data-testid="fallback-cover"
      >
        <div className={styles.frame} />
        <div className={styles.text}>
          <span className={styles.author}>{coverAuthorLabel(book.authors.map((a) => a.name))}</span>
          <span className={styles.title}>{book.title}</span>
          <svg className={styles.ornament} viewBox="0 0 60 10" aria-hidden="true">
            <path d="M2 5h22M36 5h22" stroke="currentColor" strokeWidth="1" />
            <path d="M30 1.5 33.5 5 30 8.5 26.5 5Z" fill="currentColor" />
          </svg>
        </div>
      </div>
    )
  }
  return (
    <div className={`${styles.cover} ${styles.photo} ${transition.className}`} style={transition.style}>
      <img
        className={styles.image}
        src={coverSrc(book.coverUrl)}
        alt={`Cover of ${book.title}`}
        width={200}
        height={300}
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={high ? 'high' : undefined}
        decoding="async"
        onError={() => setFailed(true)}
        onLoad={(e) => {
          if (e.currentTarget.naturalWidth <= 1) setFailed(true)
        }}
      />
    </div>
  )
}
