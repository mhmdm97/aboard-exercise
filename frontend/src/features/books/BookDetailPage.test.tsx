import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { sampleBook } from '../../test/fixtures'
import { anonymous, admin, calls, member, mockApi } from '../../test/mockApi'
import { renderWithProviders } from '../../test/renderWithProviders'
import { BookDetailPage } from './BookDetailPage'

const bookPath = `/api/books/${sampleBook.id}`
const render = (extra = {}) =>
  renderWithProviders(<BookDetailPage />, {
    path: '/books/:id',
    route: `/books/${sampleBook.id}`,
    routes: [{ path: '/', element: <p>Library home</p> }],
    ...extra,
  })

describe('BookDetailPage', () => {
  it('renders the book with genre chips linking to the library filter', async () => {
    mockApi({ [`GET ${bookPath}`]: { body: sampleBook }, 'GET /api/auth/me': anonymous })
    render()
    expect(await screen.findByRole('heading', { name: 'Dune' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Frank Herbert' })).toHaveAttribute(
      'href',
      `/?author=${sampleBook.authors[0].id}`,
    )
    expect(screen.getByText('9780441172719')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Science Fiction' })).toHaveAttribute('href', '/?genre=sci-fi')
    expect(screen.queryByRole('button', { name: /Favourite/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument()
  })

  it('shows a not-found state on 404', async () => {
    mockApi({ 'GET /api/auth/me': anonymous })
    render()
    expect(await screen.findByRole('heading', { name: 'Book not found' })).toBeInTheDocument()
  })

  it('hides Edit and Delete from members', async () => {
    mockApi({ [`GET ${bookPath}`]: { body: sampleBook }, 'GET /api/auth/me': { body: { user: member } }, 'GET /api/me/favourites/ids': { body: [] } })
    render()
    await screen.findByRole('button', { name: /favourites/i })
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it('lets an admin edit, and delete after confirming', async () => {
    const fetchMock = mockApi({
      [`GET ${bookPath}`]: { body: sampleBook },
      [`DELETE ${bookPath}`]: { status: 204 },
      'GET /api/auth/me': { body: { user: admin } },
      'GET /api/me/favourites/ids': { body: [] },
    })
    const { router } = render()
    expect(await screen.findByRole('link', { name: 'Edit' })).toHaveAttribute('href', `/books/${sampleBook.id}/edit`)

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    const dialog = await screen.findByRole('dialog', { name: 'Delete this book?' })
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(dialog).not.toBeInTheDocument())
    expect(calls(fetchMock)).not.toContain(`DELETE ${bookPath}`)

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }))
    expect(await screen.findByText('Library home')).toBeInTheDocument()
    expect(calls(fetchMock)).toContain(`DELETE ${bookPath}`)
    expect(router.state.location.state).toEqual({ message: '"Dune" was deleted.' })
  })

  it('toggles the favourite with PUT then DELETE', async () => {
    const ids: string[] = []
    const fetchMock = mockApi({
      [`GET ${bookPath}`]: { body: sampleBook },
      'GET /api/auth/me': { body: { user: member } },
      'GET /api/me/favourites/ids': () => ({ body: [...ids] }),
      [`PUT ${bookPath}/favourite`]: () => {
        ids.push(sampleBook.id)
        return { status: 204 }
      },
      [`DELETE ${bookPath}/favourite`]: () => {
        ids.length = 0
        return { status: 204 }
      },
    })
    render()
    const heart = await screen.findByRole('button', { name: /favourites/i })
    await waitFor(() => expect(calls(fetchMock)).toContain('GET /api/me/favourites/ids'))
    expect(heart).toHaveAttribute('aria-pressed', 'false')

    await userEvent.click(heart)
    await waitFor(() => expect(heart).toHaveAttribute('aria-pressed', 'true'))
    expect(calls(fetchMock)).toContain(`PUT ${bookPath}/favourite`)

    await userEvent.click(heart)
    await waitFor(() => expect(heart).toHaveAttribute('aria-pressed', 'false'))
    expect(calls(fetchMock)).toContain(`DELETE ${bookPath}/favourite`)
  })
})
