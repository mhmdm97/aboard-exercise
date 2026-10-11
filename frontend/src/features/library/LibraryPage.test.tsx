import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sampleBook } from '../../test/fixtures'
import { renderWithProviders } from '../../test/renderWithProviders'
import { LibraryPage } from './LibraryPage'

const fetchMock = vi.fn<typeof fetch>()

function json(body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }))
}

function list(items: unknown[]) {
  return { items, total: items.length, page: 1, pageSize: 24, totalPages: 1 }
}

function mockApi(items: unknown[]) {
  fetchMock.mockImplementation((input) => {
    const url = String(input)
    if (url.startsWith('/api/auth/me')) return Promise.resolve(new Response('{}', { status: 401 }))
    if (url.startsWith('/api/genres')) {
      return json([{ id: '33333333-3333-4333-8333-333333333331', name: 'Science Fiction', slug: 'sci-fi' }])
    }
    return json(list(items))
  })
}

const booksCalls = () => fetchMock.mock.calls.map(([u]) => String(u)).filter((u) => u.startsWith('/api/books'))

beforeEach(() => vi.stubGlobal('fetch', fetchMock))
afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

describe('LibraryPage', () => {
  it('shows books and the result count', async () => {
    mockApi([sampleBook])
    renderWithProviders(<LibraryPage />)
    expect(await screen.findByRole('heading', { name: 'Dune' })).toBeInTheDocument()
    expect(screen.getByText('1 book')).toBeInTheDocument()
    expect(await screen.findByRole('checkbox', { name: 'Science Fiction' })).toBeInTheDocument()
  })

  it('sends the typed search term (debounced) as q and keeps it in the URL', async () => {
    mockApi([sampleBook])
    const { router } = renderWithProviders(<LibraryPage />)
    await screen.findByRole('heading', { name: 'Dune' })

    await userEvent.type(screen.getByRole('searchbox', { name: 'Search books' }), 'herbert')

    await waitFor(() => expect(booksCalls().some((u) => u.includes('q=herbert'))).toBe(true))
    expect(router.state.location.search).toBe('?q=herbert')
    // No request for partial input thanks to the debounce.
    expect(booksCalls().some((u) => u.includes('q=herb&'))).toBe(false)
  })

  it('sends selected genres as repeated params', async () => {
    mockApi([sampleBook])
    renderWithProviders(<LibraryPage />, { route: '/?genre=sci-fi&genre=classics' })
    await waitFor(() => expect(booksCalls()[0]).toContain('genre=sci-fi&genre=classics'))
  })

  it('renders the empty state and clears filters', async () => {
    mockApi([])
    const { router } = renderWithProviders(<LibraryPage />, { route: '/?q=zzz' })
    expect(await screen.findByText('No books match your filters')).toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button', { name: 'Clear filters' })[0])
    await waitFor(() => expect(router.state.location.search).toBe(''))
  })

  it('shows an error with retry when the request fails', async () => {
    fetchMock.mockImplementation((input) =>
      String(input).startsWith('/api/genres')
        ? json([])
        : Promise.resolve(
            new Response(JSON.stringify({ error: { code: 'boom', message: 'Server exploded' } }), { status: 400 }),
          ),
    )
    renderWithProviders(<LibraryPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Server exploded')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})
