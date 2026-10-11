import { useCallback, useContext, useSyncExternalStore } from 'react'
import { flushSync } from 'react-dom'
import { UNSAFE_DataRouterContext, useNavigate, useViewTransitionState } from 'react-router'

/**
 * Whether a navigation should run inside a View Transition: the browser supports it (Firefox < 144 does not)
 * and the user has not asked for reduced motion. Pass the result as `viewTransition` to `<Link>` / `navigate()`;
 * when false the navigation is an ordinary, instant route change.
 */
export function canViewTransition(): boolean {
  if (typeof document === 'undefined' || typeof document.startViewTransition !== 'function') return false
  return !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/** The book whose cover is morphing during a transition we run ourselves (see `useGoBack`). */
let forcedBookId: string | null = null
const listeners = new Set<() => void>()
function forceMorph(id: string | null) {
  forcedBookId = id
  listeners.forEach((l) => l())
}
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => void listeners.delete(listener)
}

/**
 * The `view-transition-name` for a book cover, set only while a transition to or from that book's detail page
 * is running. Names must be unique on the page, so only the cover of the book being opened (or left) carries one.
 */
export function useCoverTransitionName(bookId: string | null): string | undefined {
  const transitioning = useViewTransitionState(`/books/${bookId ?? ''}`)
  const forced = useSyncExternalStore(subscribe, () => forcedBookId)
  return bookId && (transitioning || forced === bookId) ? `cover-${bookId}` : undefined
}

/**
 * Go back one history entry. React Router's `navigate(-1)` takes no `viewTransition` option, so when transitions are
 * available this wraps it in `document.startViewTransition` itself, naming the detail cover so it morphs back into its
 * card. Otherwise it is a plain, instant `navigate(-1)`. (The browser's own back button is not animated.)
 */
export function useGoBack(bookId: string): () => void {
  const navigate = useNavigate()
  const router = useContext(UNSAFE_DataRouterContext)?.router
  return useCallback(() => {
    if (!router || !canViewTransition()) {
      void navigate(-1)
      return
    }
    const startKey = router.state.location.key
    // Name the detail cover now, so the "old" snapshot contains it.
    flushSync(() => forceMorph(bookId))
    const transition = document.startViewTransition(
      () =>
        new Promise<void>((resolve) => {
          const stop = router.subscribe((state) => {
            if (state.navigation.state === 'idle' && state.location.key !== startKey) {
              stop()
              // Let React commit the new page (and the card that now carries the name) before the "new" snapshot.
              requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
            }
          })
          void navigate(-1)
        }),
    )
    void transition.finished.finally(() => forceMorph(null))
  }, [router, navigate, bookId])
}
