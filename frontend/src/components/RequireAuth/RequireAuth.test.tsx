import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { admin, member, mockApi, unauthorized } from '../../test/mockApi'
import { renderWithProviders } from '../../test/renderWithProviders'
import { RequireAuth, RequireRole } from './RequireAuth'

const secret = (
  <RequireRole role="admin">
    <p>Secret admin content</p>
  </RequireRole>
)

describe('RequireRole', () => {
  it('shows the 403 page to a member', async () => {
    mockApi({ 'GET /api/auth/me': { body: member } })
    renderWithProviders(secret)
    expect(await screen.findByRole('heading', { name: "You don't have access" })).toBeInTheDocument()
    expect(screen.queryByText('Secret admin content')).not.toBeInTheDocument()
  })

  it('shows the content to an admin', async () => {
    mockApi({ 'GET /api/auth/me': { body: admin } })
    renderWithProviders(secret)
    expect(await screen.findByText('Secret admin content')).toBeInTheDocument()
  })

  it('redirects anonymous users to login, remembering where they were', async () => {
    mockApi({ 'GET /api/auth/me': unauthorized })
    const { router } = renderWithProviders(secret, {
      route: '/?page=2',
      routes: [{ path: '/login', element: <p>Login page</p> }],
    })
    expect(await screen.findByText('Login page')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
    expect(router.state.location.search).toBe('?redirect=%2F%3Fpage%3D2')
  })
})

describe('RequireAuth', () => {
  it('lets any logged-in user through', async () => {
    mockApi({ 'GET /api/auth/me': { body: member } })
    renderWithProviders(
      <RequireAuth>
        <p>Members area</p>
      </RequireAuth>,
    )
    expect(await screen.findByText('Members area')).toBeInTheDocument()
  })
})
