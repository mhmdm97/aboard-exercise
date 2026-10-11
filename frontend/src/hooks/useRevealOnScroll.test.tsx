import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MAX_REVEAL_STAGGER, useRevealOnScroll } from './useRevealOnScroll'

type Callback = (entries: Partial<IntersectionObserverEntry>[], obs: IntersectionObserver) => void

let callback: Callback
let instance: IntersectionObserver
let observed: Element[]
const unobserve = vi.fn((el: Element) => {
  observed = observed.filter((o) => o !== el)
})

function Cards({ count }: { count: number }) {
  const ref = useRevealOnScroll()
  return (
    <div>
      {Array.from({ length: count }, (_, i) => (
        <article key={i} ref={ref} data-testid={`card-${i}`} tabIndex={0} />
      ))}
    </div>
  )
}

const report = (...els: Element[]) =>
  act(() => callback(els.map((target) => ({ target, isIntersecting: true })), instance))

describe('useRevealOnScroll', () => {
  beforeEach(() => {
    observed = []
    unobserve.mockClear()
    class MockObserver {
      constructor(cb: Callback) {
        callback = cb
        instance = this as unknown as IntersectionObserver
      }
      observe = (el: Element) => observed.push(el)
      unobserve = unobserve
      disconnect = vi.fn()
    }
    vi.stubGlobal('IntersectionObserver', MockObserver)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('leaves cards unrevealed until the observer reports them, then reveals once', () => {
    render(<Cards count={3} />)
    expect(observed).toHaveLength(3)
    expect(screen.getByTestId('card-0').dataset.revealed).toBeUndefined()

    report(screen.getByTestId('card-1'))
    expect(screen.getByTestId('card-1').dataset.revealed).toBe('true')
    expect(screen.getByTestId('card-0').dataset.revealed).toBeUndefined()
    expect(unobserve).toHaveBeenCalledWith(screen.getByTestId('card-1'))
  })

  it('staggers a batch in DOM order (not report order) and caps the index', () => {
    render(<Cards count={12} />)
    const cards = Array.from({ length: 12 }, (_, i) => screen.getByTestId(`card-${i}`))
    report(...[...cards].reverse())
    cards.forEach((card, i) => {
      expect(card.style.getPropertyValue('--i')).toBe(String(Math.min(i, MAX_REVEAL_STAGGER)))
    })
  })

  it('restarts the stagger for a later batch', () => {
    render(<Cards count={4} />)
    report(screen.getByTestId('card-0'), screen.getByTestId('card-1'))
    report(screen.getByTestId('card-2'), screen.getByTestId('card-3'))
    expect(screen.getByTestId('card-2').style.getPropertyValue('--i')).toBe('0')
    expect(screen.getByTestId('card-3').style.getPropertyValue('--i')).toBe('1')
  })

  it('reveals a card as soon as it receives focus', () => {
    render(<Cards count={2} />)
    fireEvent.focusIn(screen.getByTestId('card-1'))
    expect(screen.getByTestId('card-1').dataset.revealed).toBe('true')
    expect(screen.getByTestId('card-0').dataset.revealed).toBeUndefined()
  })

  it('does not un-reveal or replay a card when the list re-renders', () => {
    const { rerender } = render(<Cards count={2} />)
    report(screen.getByTestId('card-0'))
    rerender(<Cards count={3} />)
    expect(screen.getByTestId('card-0').dataset.revealed).toBe('true')
    expect(screen.getByTestId('card-2').dataset.revealed).toBeUndefined()
  })

  it('reveals everything immediately without IntersectionObserver', () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    render(<Cards count={3} />)
    for (let i = 0; i < 3; i++) expect(screen.getByTestId(`card-${i}`).dataset.revealed).toBe('true')
  })
})
