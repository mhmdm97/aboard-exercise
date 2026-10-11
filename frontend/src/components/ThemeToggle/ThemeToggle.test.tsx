import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ThemeToggle } from './ThemeToggle'

const root = document.documentElement

beforeEach(() => {
  localStorage.clear()
  root.removeAttribute('data-theme')
})
afterEach(() => root.removeAttribute('data-theme'))

describe('ThemeToggle', () => {
  it('cycles System, Light, Dark, persists the choice and sets data-theme', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)
    const btn = () => screen.getByRole('button', { name: /^Theme:/ })

    expect(btn()).toHaveAccessibleName('Theme: System. Switch to Light')
    expect(root).not.toHaveAttribute('data-theme')

    await user.click(btn())
    expect(btn()).toHaveAccessibleName('Theme: Light. Switch to Dark')
    expect(root).toHaveAttribute('data-theme', 'light')
    expect(localStorage.getItem('shelf-theme')).toBe('light')

    await user.click(btn())
    expect(btn()).toHaveAccessibleName('Theme: Dark. Switch to System')
    expect(root).toHaveAttribute('data-theme', 'dark')
    expect(localStorage.getItem('shelf-theme')).toBe('dark')

    await user.click(btn())
    expect(root).not.toHaveAttribute('data-theme')
    expect(localStorage.getItem('shelf-theme')).toBeNull()
  })

  it('applies the stored theme on mount', () => {
    localStorage.setItem('shelf-theme', 'dark')
    render(<ThemeToggle />)
    expect(screen.getByRole('button', { name: 'Theme: Dark. Switch to System' })).toBeInTheDocument()
    expect(root).toHaveAttribute('data-theme', 'dark')
  })

  it('ignores an invalid stored value', () => {
    localStorage.setItem('shelf-theme', 'purple')
    render(<ThemeToggle />)
    expect(screen.getByRole('button', { name: 'Theme: System. Switch to Light' })).toBeInTheDocument()
  })
})
