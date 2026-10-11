import type { JSX } from 'react'
import { useTheme, type ThemeChoice } from '../../hooks/useTheme'
import { MonitorIcon, MoonIcon, SunIcon } from '../icons'

const LABEL: Record<ThemeChoice, string> = { system: 'System', light: 'Light', dark: 'Dark' }
const NEXT: Record<ThemeChoice, ThemeChoice> = { system: 'light', light: 'dark', dark: 'system' }
const ICON: Record<ThemeChoice, () => JSX.Element> = { system: MonitorIcon, light: SunIcon, dark: MoonIcon }

/** One button cycling System, Light, Dark. The accessible name states the current theme and what a press does. */
export function ThemeToggle() {
  const { theme, cycle } = useTheme()
  const Icon = ICON[theme]
  return (
    <button
      type="button"
      className="btn btn-ghost btn-icon"
      aria-label={`Theme: ${LABEL[theme]}. Switch to ${LABEL[NEXT[theme]]}`}
      title={`Theme: ${LABEL[theme]}`}
      onClick={cycle}
    >
      <Icon />
    </button>
  )
}
