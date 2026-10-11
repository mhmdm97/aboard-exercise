import { lazy } from 'react'

/** Dev-only: `import.meta.env.DEV` is a build-time constant, so production builds drop the dynamic import entirely. */
export const QueryDevtools = import.meta.env.DEV
  ? lazy(() => import('@tanstack/react-query-devtools').then((m) => ({ default: m.ReactQueryDevtools })))
  : null
