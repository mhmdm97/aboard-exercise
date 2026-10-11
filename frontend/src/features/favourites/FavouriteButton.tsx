import { useCurrentUser } from '../auth/api'
import { useFavouriteIds, useToggleFavourite } from './api'
import styles from './FavouriteButton.module.css'

interface Props {
  bookId: string
  title: string
  /** `full` shows a text label next to the heart (detail page); `icon` is for cards. */
  variant?: 'icon' | 'full'
}

/** Heart toggle. Renders nothing for anonymous users. */
export function FavouriteButton({ bookId, title, variant = 'icon' }: Props) {
  const { data: user } = useCurrentUser()
  const { data: ids } = useFavouriteIds()
  const toggle = useToggleFavourite(bookId)
  if (!user) return null

  const active = ids?.includes(bookId) ?? false
  return (
    <button
      type="button"
      className={`${styles.heart} ${variant === 'icon' ? styles.icon : styles.full} ${active ? styles.active : ''}`}
      aria-pressed={active}
      aria-label={`Favourite ${title}`}
      onClick={() => toggle.mutate(!active)}
    >
      <span aria-hidden="true">{active ? '♥' : '♡'}</span>
      {variant === 'full' && <span aria-hidden="true"> {active ? 'Favourited' : 'Favourite'}</span>}
    </button>
  )
}
