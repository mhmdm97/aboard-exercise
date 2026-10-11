import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import type { RouteObject } from 'react-router'

interface Options {
  route?: string
  /** Path `ui` is mounted at (default `/`); use e.g. `/books/:id` with a matching `route`. */
  path?: string
  /** Extra routes, e.g. a `/login` stub to assert redirects. */
  routes?: RouteObject[]
}

/** Renders `ui` at `route` inside a fresh QueryClient (no retries) and a memory data router. */
export function renderWithProviders(ui: ReactElement, { route = '/', path = '/', routes = [] }: Options = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(
    [
      { path, element: ui },
      ...(path === '/books/:id' ? [] : [{ path: '/books/:id', element: <p>Book detail page</p> }]),
      ...routes,
    ],
    { initialEntries: [route] },
  )
  const result = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { ...result, router, queryClient }
}
