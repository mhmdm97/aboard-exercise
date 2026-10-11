import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { Layout } from './Layout'

function renderLayout() {
  const router = createMemoryRouter(
    [{ path: '/', element: <Layout />, children: [{ index: true, element: <p>Home content</p> }] }],
    { initialEntries: ['/'] },
  )
  return render(<RouterProvider router={router} />)
}

describe('Layout', () => {
  it('renders navigation, skip link, content and footer', () => {
    renderLayout()
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main')
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Library' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument()
    expect(screen.getByText('Home content')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('toggles aria-expanded on the menu button', async () => {
    renderLayout()
    const button = screen.getByRole('button', { name: 'Menu' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(button)
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true')
  })
})
