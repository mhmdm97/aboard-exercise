import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { calls, member, mockApi } from '../../test/mockApi'
import { renderWithProviders } from '../../test/renderWithProviders'
import { safeRedirect } from './api'
import { LoginPage } from './LoginPage'
import { RegisterPage } from './RegisterPage'

const home = { path: '/home', element: <p>Home page</p> }

describe('LoginPage', () => {
  it('shows client validation errors and does not call the API', async () => {
    const fetchMock = mockApi({})
    renderWithProviders(<LoginPage />, { route: '/' })
    await userEvent.type(screen.getByLabelText('Email'), 'not-an-email')
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }))
    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument()
    expect(screen.getByText('Enter your password.')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
    expect(calls(fetchMock)).toEqual([])
    expect(screen.getByText(/admin@library.local \/ Admin123!/)).toBeInTheDocument()
  })

  it('logs in and redirects to the ?redirect= path', async () => {
    const fetchMock = mockApi({ 'POST /api/auth/login': { body: member } })
    renderWithProviders(<LoginPage />, { route: '/?redirect=/home', routes: [home] })
    await userEvent.type(screen.getByLabelText('Email'), 'm@x.io')
    await userEvent.type(screen.getByLabelText('Password'), 'Member123!')
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }))
    expect(await screen.findByText('Home page')).toBeInTheDocument()
    expect(calls(fetchMock)).toContain('POST /api/auth/login')
  })

  it('shows the server message on 401', async () => {
    mockApi({
      'POST /api/auth/login': {
        status: 401,
        body: { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } },
      },
    })
    renderWithProviders(<LoginPage />)
    await userEvent.type(screen.getByLabelText('Email'), 'm@x.io')
    await userEvent.type(screen.getByLabelText('Password'), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password')
  })
})

describe('RegisterPage', () => {
  it('maps a 409 to the email field error', async () => {
    mockApi({
      'POST /api/auth/register': {
        status: 409,
        body: { error: { code: 'CONFLICT', message: 'Email already registered' } },
      },
    })
    renderWithProviders(<RegisterPage />)
    await userEvent.type(screen.getByLabelText('Name'), 'Mia')
    await userEvent.type(screen.getByLabelText('Email'), 'm@x.io')
    await userEvent.type(screen.getByLabelText('Password'), 'Member123!')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))
    await waitFor(() =>
      expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('An account with this email already exists.'),
    )
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
  })
})

describe('safeRedirect', () => {
  it('only allows relative in-app paths', () => {
    expect(safeRedirect('/books/1?x=2')).toBe('/books/1?x=2')
    expect(safeRedirect('https://evil.example')).toBe('/')
    expect(safeRedirect('//evil.example')).toBe('/')
    expect(safeRedirect(null)).toBe('/')
  })
})
