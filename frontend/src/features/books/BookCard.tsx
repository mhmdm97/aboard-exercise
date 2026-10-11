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

export function Cover({ book }: { book: BookDto }) {
  const [failed, setFailed] = useState(false)
  const authors = book.authors.map((a) => a.name).join(', ')

  if (!book.coverUrl || failed) {
    return (
      <div
        className={styles.fallback}
        style={{ background: `hsl(${hueFromTitle(book.title)} 45% 32%)` }}
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
      loading="lazy"
      onError={() => setFailed(true)}
      onLoad={(e) => {
        if (e.currentTarget.naturalWidth <= 1) setFailed(true)
      }}
    />
  )
}

export function BookCard({ book }: { book: BookDto }) {
  const authors = book.authors.map((a) => a.name).join(', ')
  return (
    <div className={styles.wrapper}>
      <Link to={`/books/${book.id}`} className={styles.card}>
        <div className={styles.cover}>
          <Cover book={book} />
        </div>
        <div className={styles.body}>
          <h3 className={styles.title}>{book.title}</h3>
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
