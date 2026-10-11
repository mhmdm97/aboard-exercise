import { useState } from 'react'
import { useCurrentUser } from '../auth/api'
import { useFavouriteIds, useToggleFavourite } from './api'
import styles from './FavouriteButton.module.css'

interface Props {
  bookId: string
  title: string
  /** `full` shows a text label next to the heart (detail page); `icon` is the round button on cards. */
  variant?: 'icon' | 'full'
}

function HeartIcon() {
  return (
    <svg className={styles.svg} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2Z" />
    </svg>
  )
}

/** Heart toggle. Renders nothing for anonymous users. */
export function FavouriteButton({ bookId, title, variant = 'icon' }: Props) {
  const { data: user } = useCurrentUser()
  const { data: ids } = useFavouriteIds()
  const toggle = useToggleFavourite(bookId)
  // Set by a user press only, so hearts that are already on when a page loads do not pop.
  const [motion, setMotion] = useState<'on' | 'off' | null>(null)
  if (!user) return null

  const active = ids?.includes(bookId) ?? false
  const classes = [
    styles.heart,
    variant === 'icon' ? styles.icon : `btn btn-secondary ${styles.full}`,
    active ? styles.active : '',
    motion === 'on' && active ? styles.popOn : '',
    motion === 'off' && !active ? styles.popOff : '',
  ]
  return (
    <button
      type="button"
      className={classes.filter(Boolean).join(' ')}
      aria-pressed={active}
      aria-label={variant === 'icon' ? `Favourite ${title}` : undefined}
      onClick={() => {
        setMotion(active ? 'off' : 'on')
        toggle.mutate(!active)
      }}
    >
      <HeartIcon />
      {variant === 'full' && <span>{active ? 'In your favourites' : 'Add to favourites'}</span>}
    </button>
  )
}
