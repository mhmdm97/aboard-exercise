import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { sampleBook } from '../../test/fixtures'
import { calls, mockApi } from '../../test/mockApi'
import { renderWithProviders } from '../../test/renderWithProviders'
import { BookFormPage } from './BookFormPage'

const genres = sampleBook.genres
const bookPath = `/api/books/${sampleBook.id}`
const lookups = { 'GET /api/genres': { body: genres }, 'GET /api/authors': { body: [] } }

/** The JSON body of the last request matching `METHOD path`. */
function sentBody(fetchMock: ReturnType<typeof mockApi>, key: string): unknown {
  const call = fetchMock.mock.calls.filter(([url, init]) => `${init?.method ?? 'GET'} ${String(url).split('?')[0]}` === key).at(-1)
  return JSON.parse(String(call?.[1]?.body))
}

const renderNew = () => renderWithProviders(<BookFormPage />, { path: '/books/new', route: '/books/new' })
const renderEdit = () =>
  renderWithProviders(<BookFormPage />, { path: '/books/:id/edit', route: `/books/${sampleBook.id}/edit` })

describe('BookFormPage (create)', () => {
  it('blocks submit and shows errors for a missing title and author', async () => {
    const fetchMock = mockApi(lookups)
    renderNew()
    await userEvent.click(screen.getByRole('button', { name: 'Create book' }))
    expect(await screen.findByText('Title is required.')).toBeInTheDocument()
    expect(screen.getByText('Author name is required.')).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true')
    expect(calls(fetchMock)).not.toContain('POST /api/books')
  })

  it('lets authors be added and removed within 1..10', async () => {
    mockApi(lookups)
    renderNew()
    expect(screen.getByRole('button', { name: 'Remove author 1' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Add author' }))
    expect(screen.getByLabelText('Author 2')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Remove author 1' }))
    expect(screen.queryByLabelText('Author 2')).not.toBeInTheDocument()
  })

  it('POSTs normalised JSON (blank optionals null, numbers as numbers) and navigates to the book', async () => {
    const fetchMock = mockApi({ ...lookups, 'POST /api/books': { status: 201, body: sampleBook } })
    const { router } = renderNew()
    await userEvent.type(screen.getByLabelText('Title'), '  Dune ')
    await userEvent.type(screen.getByLabelText('Author 1'), 'Frank Herbert')
    await userEvent.type(screen.getByLabelText('Published year'), '1965')
    await userEvent.type(screen.getByLabelText('Rating (0-5)'), '4.2')
    await userEvent.click(await screen.findByLabelText('Classics'))
    await userEvent.click(screen.getByRole('button', { name: 'Create book' }))

    await waitFor(() => expect(router.state.location.pathname).toBe(`/books/${sampleBook.id}`))
    expect(sentBody(fetchMock, 'POST /api/books')).toEqual({
      title: 'Dune',
      subtitle: null,
      description: null,
      isbn: null,
      coverUrl: null,
      publishedYear: 1965,
      pageCount: null,
      averageRating: 4.2,
      authorNames: ['Frank Herbert'],
      genreSlugs: ['classics'],
    })
  })

  it('shows a banner for a server validation error', async () => {
    mockApi({
      ...lookups,
      'POST /api/books': { status: 400, body: { error: { code: 'VALIDATION_ERROR', message: 'Unknown genre: nope' } } },
    })
    renderNew()
    await userEvent.type(screen.getByLabelText('Title'), 'Dune')
    await userEvent.type(screen.getByLabelText('Author 1'), 'Frank Herbert')
    await userEvent.click(screen.getByRole('button', { name: 'Create book' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Unknown genre: nope')
  })
})

describe('BookFormPage (edit)', () => {
  it('prefills from the book and PUTs the full body', async () => {
    const fetchMock = mockApi({ ...lookups, [`GET ${bookPath}`]: { body: sampleBook }, [`PUT ${bookPath}`]: { body: sampleBook } })
    const { router } = renderEdit()
    expect(await screen.findByDisplayValue('Dune')).toBeInTheDocument()
    expect(screen.getByLabelText('Author 1')).toHaveValue('Frank Herbert')
    expect(screen.getByLabelText('Published year')).toHaveValue(1965)
    expect(await screen.findByLabelText('Classics')).toBeChecked()

    await userEvent.clear(screen.getByLabelText('Pages'))
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(router.state.location.pathname).toBe(`/books/${sampleBook.id}`))
    expect(sentBody(fetchMock, `PUT ${bookPath}`)).toMatchObject({
      title: 'Dune',
      isbn: '9780441172719',
      pageCount: null,
      authorNames: ['Frank Herbert'],
      genreSlugs: ['sci-fi', 'classics', 'adventure'],
    })
  })

  it('maps a 409 to an ISBN field error', async () => {
    mockApi({
      ...lookups,
      [`GET ${bookPath}`]: { body: sampleBook },
      [`PUT ${bookPath}`]: { status: 409, body: { error: { code: 'CONFLICT', message: 'ISBN exists' } } },
    })
    renderEdit()
    await screen.findByDisplayValue('Dune')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('A book with this ISBN already exists.')).toBeInTheDocument()
    expect(screen.getByLabelText('ISBN')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows not-found for an unknown book', async () => {
    mockApi(lookups)
    renderEdit()
    expect(await screen.findByRole('heading', { name: 'Book not found' })).toBeInTheDocument()
  })
})
