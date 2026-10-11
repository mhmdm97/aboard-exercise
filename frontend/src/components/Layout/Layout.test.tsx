import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { admin, calls, member, mockApi, unauthorized } from '../../test/mockApi'
import { Layout } from './Layout'

function renderLayout() {
  const router = createMemoryRouter(
    [{ path: '/', element: <Layout />, children: [{ index: true, element: <p>Home content</p> }] }],
    { initialEntries: ['/'] },
  )
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

describe('Layout', () => {
  it('renders navigation, skip link, content and footer', async () => {
    mockApi({ 'GET /api/auth/me': unauthorized })
    renderLayout()
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main')
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Library' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Log in' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Add book' })).not.toBeInTheDocument()
    expect(screen.getByText('Home content')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('toggles aria-expanded on the menu button', async () => {
    mockApi({ 'GET /api/auth/me': unauthorized })
    renderLayout()
    const button = screen.getByRole('button', { name: 'Menu' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(button)
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('shows name, role, favourites and logout for a member, but no Add book', async () => {
    const fetchMock = mockApi({ 'GET /api/auth/me': { body: member }, 'POST /api/auth/logout': { status: 204 } })
    renderLayout()
    expect(await screen.findByText('Mia')).toBeInTheDocument()
    expect(screen.getByText('member')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Favourites' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Add book' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Log out' }))
    expect(await screen.findByRole('link', { name: 'Log in' })).toBeInTheDocument()
    expect(calls(fetchMock)).toContain('POST /api/auth/logout')
  })

  it('shows Add book for an admin', async () => {
    mockApi({ 'GET /api/auth/me': { body: admin } })
    renderLayout()
    expect(await screen.findByRole('link', { name: 'Add book' })).toBeInTheDocument()
  })
})
