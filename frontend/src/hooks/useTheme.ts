import { useCallback, useEffect, useState } from 'react'

export type ThemeChoice = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'shelf-theme'
const ORDER: ThemeChoice[] = ['system', 'light', 'dark']
const META_COLOUR = { light: '#f5efe3', dark: '#14110d' }

function readStored(): ThemeChoice {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

function applyTheme(choice: ThemeChoice) {
  const root = document.documentElement
  if (choice === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', choice)
  const dark = choice === 'dark' || (choice === 'system' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? META_COLOUR.dark : META_COLOUR.light)
}

/** The user's theme choice (System / Light / Dark), persisted in localStorage and mirrored to `<html data-theme>`. */
export function useTheme() {
  const [theme, setTheme] = useState<ThemeChoice>(readStored)

  useEffect(() => {
    applyTheme(theme)
    if (theme !== 'system') return
    // Keep the theme-color meta in step with the OS while following it.
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    mq?.addEventListener?.('change', onChange)
    return () => mq?.removeEventListener?.('change', onChange)
  }, [theme])

  const cycle = useCallback(() => {
    const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length]
    try {
      if (next === 'system') localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* storage unavailable: the choice lasts for this page view */
    }
    setTheme(next)
  }, [theme])

  return { theme, cycle }
}
