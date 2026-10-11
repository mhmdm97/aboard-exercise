import { useState } from 'react'
import { act, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sampleBook } from '../../test/fixtures'
import { renderWithProviders as render } from '../../test/renderWithProviders'
import { COVER_TIMEOUT_MS, Cover } from './Cover'

function loaded(img: HTMLElement, naturalWidth = 200) {
  Object.defineProperty(img, 'naturalWidth', { value: naturalWidth, configurable: true })
  fireEvent.load(img)
}

function Harness() {
  const [url, setUrl] = useState(sampleBook.coverUrl)
  return (
    <>
      <button onClick={() => setUrl('https://example.com/other.jpg')}>change</button>
      <Cover book={{ ...sampleBook, coverUrl: url }} />
    </>
  )
}

describe('Cover timeout', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('falls back to the generated cover when the image does not load in time', () => {
    render(<Cover book={sampleBook} />)
    act(() => void vi.advanceTimersByTime(COVER_TIMEOUT_MS - 1))
    expect(screen.getByAltText('Cover of Dune')).toBeInTheDocument()
    act(() => void vi.advanceTimersByTime(1))
    expect(screen.queryByAltText('Cover of Dune')).not.toBeInTheDocument()
    expect(screen.getByTestId('fallback-cover')).toBeInTheDocument()
  })

  it('keeps the image and clears the timer when it loads in time', () => {
    render(<Cover book={sampleBook} />)
    loaded(screen.getByAltText('Cover of Dune'))
    expect(vi.getTimerCount()).toBe(0)
    act(() => void vi.advanceTimersByTime(COVER_TIMEOUT_MS * 2))
    expect(screen.getByAltText('Cover of Dune')).toBeInTheDocument()
    expect(screen.queryByTestId('fallback-cover')).not.toBeInTheDocument()
  })

  it('falls back immediately on error and on a 1x1 placeholder', () => {
    const { unmount } = render(<Cover book={sampleBook} />)
    fireEvent.error(screen.getByAltText('Cover of Dune'))
    expect(screen.getByTestId('fallback-cover')).toBeInTheDocument()
    expect(vi.getTimerCount()).toBe(0)
    unmount()
    render(<Cover book={sampleBook} />)
    loaded(screen.getByAltText('Cover of Dune'), 1)
    expect(screen.getByTestId('fallback-cover')).toBeInTheDocument()
  })

  it('resets when the src changes and clears the timer on unmount', () => {
    const { unmount } = render(<Harness />)
    act(() => void vi.advanceTimersByTime(COVER_TIMEOUT_MS))
    expect(screen.getByTestId('fallback-cover')).toBeInTheDocument()
    fireEvent.click(screen.getByText('change'))
    expect(screen.getByAltText('Cover of Dune')).toHaveAttribute('src', 'https://example.com/other.jpg')
    expect(vi.getTimerCount()).toBe(1)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('shows an already-complete cached image without a timer or fallback', () => {
    vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true)
    vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(200)
    render(<Cover book={sampleBook} />)
    expect(vi.getTimerCount()).toBe(0)
    act(() => void vi.advanceTimersByTime(COVER_TIMEOUT_MS * 2))
    expect(screen.getByAltText('Cover of Dune')).toBeInTheDocument()
    vi.restoreAllMocks()
  })
})
