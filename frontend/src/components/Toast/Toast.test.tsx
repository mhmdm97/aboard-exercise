import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Toast } from './Toast'

describe('Toast', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }))
  afterEach(() => vi.useRealTimers())

  it('announces the message in a status region, then removes it after the hold', async () => {
    render(<Toast message="Dune was deleted" />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    await act(() => vi.advanceTimersByTimeAsync(100))
    expect(screen.getByRole('status')).toHaveTextContent('Dune was deleted')

    await act(() => vi.advanceTimersByTimeAsync(4000))
    await act(() => vi.advanceTimersByTimeAsync(300))
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('can be dismissed', async () => {
    render(<Toast message="Saved" />)
    await act(() => vi.advanceTimersByTimeAsync(100))
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss message' }))
    await act(() => vi.advanceTimersByTimeAsync(300))
    expect(screen.queryByText('Saved')).not.toBeInTheDocument()
  })

  it('renders an empty region without a message', () => {
    render(<Toast message="" />)
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })
})
