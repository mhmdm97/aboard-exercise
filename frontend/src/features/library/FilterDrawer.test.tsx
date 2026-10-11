import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../test/renderWithProviders'
import type { BookFilters } from '../books/api'
import { FilterDrawer } from './FilterDrawer'

const fetchMock = vi.fn<typeof fetch>()
const filters: BookFilters = { q: '', genres: ['sci-fi'] }

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockImplementation((input) =>
    Promise.resolve(
      new Response(
        String(input).startsWith('/api/genres')
          ? JSON.stringify([{ id: '33333333-3333-4333-8333-333333333331', name: 'Science Fiction', slug: 'sci-fi' }])
          : '{}',
        { status: 200 },
      ),
    ),
  )
  // Stand-in for the app root (#root), which is made inert while the drawer is open.
  const root = document.createElement('div')
  root.id = 'root'
  document.body.append(root)
})
afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
  document.getElementById('root')?.remove()
})

function renderDrawer(props: Partial<ComponentProps<typeof FilterDrawer>> = {}) {
  const onClear = vi.fn()
  const onChange = vi.fn()
  renderWithProviders(
    <FilterDrawer filters={filters} activeCount={1} total={48} canClear onChange={onChange} onClear={onClear} {...props} />,
  )
  return { onClear, onChange }
}

describe('FilterDrawer', () => {
  it('opens as a labelled modal dialog, makes the background inert and focuses the heading', async () => {
    renderDrawer()
    const trigger = screen.getByRole('button', { name: /Filters/ })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await userEvent.click(trigger)

    const dialog = await screen.findByRole('dialog', { name: 'Filters' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(within(dialog).getByRole('heading', { name: 'Filters' })).toHaveFocus()
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(document.getElementById('root')).toHaveAttribute('inert')
    expect(await within(dialog).findByRole('button', { name: 'Science Fiction', pressed: true })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Show 48 books' })).toBeInTheDocument()
  })

  it('closes on Escape and returns focus to the trigger', async () => {
    renderDrawer()
    const trigger = screen.getByRole('button', { name: /Filters/ })
    await userEvent.click(trigger)
    await screen.findByRole('dialog')

    await userEvent.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(trigger).toHaveFocus()
    expect(document.getElementById('root')).not.toHaveAttribute('inert')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('closes from the close button, the backdrop and "Show n books"', async () => {
    renderDrawer()
    const trigger = screen.getByRole('button', { name: /Filters/ })

    await userEvent.click(trigger)
    await userEvent.click(await screen.findByRole('button', { name: 'Close filters' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(trigger).toHaveFocus()

    await userEvent.click(trigger)
    await userEvent.click(await screen.findByRole('button', { name: 'Show 48 books' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(trigger).toHaveFocus()

    await userEvent.click(trigger)
    const dialog = await screen.findByRole('dialog')
    const backdrop = dialog.previousElementSibling as HTMLElement
    await userEvent.click(backdrop)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('clears filters from the footer', async () => {
    const { onClear } = renderDrawer()
    await userEvent.click(screen.getByRole('button', { name: /Filters/ }))
    await userEvent.click(await screen.findByRole('button', { name: 'Clear' }))
    expect(onClear).toHaveBeenCalledTimes(1)
  })
})
