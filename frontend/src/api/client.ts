// Base URL is empty in dev (Vite proxies /api to the backend).
// Set VITE_API_BASE_URL for other environments.
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return (await res.json()) as T
}

export interface Health {
  status: string
  timestamp: string
}

export const getHealth = () => apiGet<Health>('/api/health')
