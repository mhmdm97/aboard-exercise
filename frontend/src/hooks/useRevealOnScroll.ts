import { useCallback, useEffect, useRef } from 'react'

/** Cards revealed in the same observer callback stagger by their order in it, up to this index. */
export const MAX_REVEAL_STAGGER = 7

const OPTIONS: IntersectionObserverInit = { threshold: 0.15, rootMargin: '0px 0px -10% 0px' }

function reveal(el: HTMLElement, order: number) {
  el.style.setProperty('--i', String(Math.min(order, MAX_REVEAL_STAGGER)))
  el.dataset.revealed = 'true'
}

/**
 * Scroll-triggered reveal with ONE shared IntersectionObserver. Pass the returned ref callback to every card.
 * A card gets `data-revealed` the first time it is visible (then it is unobserved, so it never replays) and
 * `--i` = its order within that observer callback (DOM order, capped), so each batch cascades from its own
 * first card. The attributes are set on the DOM node directly: re-renders neither reset nor replay them.
 * Without IntersectionObserver, or when a card receives focus, the card is revealed immediately.
 */
export function useRevealOnScroll() {
  const observer = useRef<IntersectionObserver | null>(null)

  useEffect(
    () => () => {
      observer.current?.disconnect()
      observer.current = null
    },
    [],
  )

  return useCallback((el: HTMLElement | null) => {
    if (!el) return
    if (el.dataset.revealed) return
    if (typeof IntersectionObserver === 'undefined') {
      reveal(el, 0)
      return
    }
    observer.current ??= new IntersectionObserver((entries, obs) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .map((e) => e.target as HTMLElement)
        .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
      visible.forEach((target, order) => {
        reveal(target, order)
        obs.unobserve(target)
      })
    }, OPTIONS)
    const io = observer.current
    const onFocus = () => {
      reveal(el, 0)
      io.unobserve(el)
    }
    el.addEventListener('focusin', onFocus)
    io.observe(el)
    return () => {
      el.removeEventListener('focusin', onFocus)
      io.unobserve(el)
    }
  }, [])
}
