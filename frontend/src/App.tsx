import { useEffect, useState } from 'react'
import { getHealth, type Health } from './api/client'
import './App.css'

function App() {
  const [health, setHealth] = useState<Health | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [])

  return (
    <main className="app">
      <h1>Abroad Exercise</h1>
      <p>
        Backend status:{' '}
        {error ? (
          <span className="status error">unreachable ({error})</span>
        ) : health ? (
          <span className="status ok">{health.status}</span>
        ) : (
          <span className="status">checking…</span>
        )}
      </p>
    </main>
  )
}

export default App
