import { Link } from 'react-router'
import type { Ref } from 'react'
import type { BookDto } from '@library/shared'
import { FavouriteButton } from '../favourites/FavouriteButton'
import { canViewTransition } from '../../hooks/viewTransition'
import { Cover, HIGH_PRIORITY_COVERS } from './Cover'
import styles from './BookCard.module.css'

interface Props {
  book: BookDto
  /** Position in the list; drives cover loading priority. */
  index?: number
  /** Ref callback from `useRevealOnScroll`; when given, the card enters (fades/rises in) as it scrolls into view. */
  revealRef?: Ref<HTMLElement>
}

function StarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 3.5 2.6 5.5 6 .7-4.5 4.1 1.2 5.9L12 16.8l-5.3 2.9 1.2-5.9-4.5-4.1 6-.7Z" fill="currentColor" />
    </svg>
  )
}

/** The whole card is one link (stretched title link); the heart is a separate button above it. */
export function BookCard({ book, index, revealRef }: Props) {
  const authors = book.authors.map((a) => a.name).join(', ')
  const enter = revealRef !== undefined
  // The first row holds the LCP covers: it rises without an opacity fade so it is never hidden (see BookCard.module.css).
  const eager = enter && index !== undefined && index < HIGH_PRIORITY_COVERS
  return (
    <article
      className={enter ? `${styles.card} ${styles.enter}` : styles.card}
      ref={revealRef}
      data-eager={eager ? '' : undefined}
    >
      <div className={styles.coverWrap}>
        <Cover book={book} index={index} morph />
        <FavouriteButton bookId={book.id} title={book.title} />
      </div>
      <h2 className={styles.title}>
        <Link to={`/books/${book.id}`} className={styles.link} viewTransition={canViewTransition()}>
          {book.title}
        </Link>
      </h2>
      {authors && <p className={styles.authors}>{authors}</p>}
      <p className={styles.meta}>
        {book.publishedYear !== null && <span>{book.publishedYear}</span>}
        {book.publishedYear !== null && <span className={styles.dot} aria-hidden="true" />}
        {book.averageRating !== null ? (
          <span className={styles.rating}>
            <StarIcon />
            <span className="visually-hidden">Rated </span>
            {book.averageRating.toFixed(1)}
          </span>
        ) : (
          <span>Not rated</span>
        )}
      </p>
      {book.genres.length > 0 && (
        <ul className={styles.genres}>
          {book.genres.slice(0, 2).map((g) => (
            <li key={g.id} className="tag">
              {g.name}
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}
