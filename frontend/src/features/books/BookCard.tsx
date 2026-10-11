import { useState } from 'react'
import { Link } from 'react-router'
import type { BookDto } from '@library/shared'
import { coverSrc } from './coverSrc'
import { FavouriteButton } from '../favourites/FavouriteButton'
import styles from './BookCard.module.css'

function hueFromTitle(title: string): number {
  let hash = 0
  for (const ch of title) hash = (hash * 31 + ch.charCodeAt(0)) % 360
  return hash
}

/** Covers at or before this index in a list load eagerly (above the fold); the first few also get high fetch priority. */
const EAGER_COVERS = 8
const HIGH_PRIORITY_COVERS = 4

interface CoverProps {
  book: BookDto
  /** Position in the list; omit for a lazy cover. */
  index?: number
  /** Force eager + high priority (the detail page's main cover). */
  priority?: boolean
}

export function Cover({ book, index = Infinity, priority = false }: CoverProps) {
  const eager = priority || index < EAGER_COVERS
  const high = priority || index < HIGH_PRIORITY_COVERS
  const [failed, setFailed] = useState(false)
  const authors = book.authors.map((a) => a.name).join(', ')

  if (!book.coverUrl || failed) {
    return (
      <div
        className={styles.fallback}
        style={{ background: `hsl(${hueFromTitle(book.title)} 45% 26%)` }}
        data-testid="fallback-cover"
      >
        <span className={styles.fallbackTitle}>{book.title}</span>
        {authors && <span className={styles.fallbackAuthor}>{authors}</span>}
      </div>
    )
  }
  return (
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
  )
}

export function BookCard({ book, index }: { book: BookDto; index?: number }) {
  const authors = book.authors.map((a) => a.name).join(', ')
  return (
    <div className={styles.wrapper}>
      <Link to={`/books/${book.id}`} className={styles.card}>
        <div className={styles.cover}>
          <Cover book={book} index={index} />
        </div>
        <div className={styles.body}>
          <h2 className={styles.title}>{book.title}</h2>
          {authors && <p className={styles.authors}>{authors}</p>}
          <p className={styles.meta}>
            {book.publishedYear !== null && <span>{book.publishedYear}</span>}
            {book.averageRating !== null ? (
              <span aria-label={`Rated ${book.averageRating.toFixed(1)} out of 5`}>
                ★ {book.averageRating.toFixed(1)}
              </span>
            ) : (
              <span>Not rated</span>
            )}
          </p>
          {book.genres.length > 0 && (
            <ul className={styles.genres}>
              {book.genres.slice(0, 2).map((g) => (
                <li key={g.id} className={styles.genre}>
                  {g.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Link>
      <FavouriteButton bookId={book.id} title={book.title} />
    </div>
  )
}
