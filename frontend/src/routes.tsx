import type { ComponentType, ReactNode } from 'react'
import type { RouteObject } from 'react-router'
import { RequireAuth, RequireRole } from './components/RequireAuth/RequireAuth'
import { Layout } from './components/Layout/Layout'
import { Spinner } from './components/Spinner/Spinner'
import { LibraryPage } from './features/library/LibraryPage'

/** Route-level code splitting: the page chunk loads on first navigation; `guard` wraps it in an auth check. */
function lazyPage(
  load: () => Promise<ComponentType>,
  guard?: (page: ReactNode) => ReactNode,
): Pick<RouteObject, 'lazy'> {
  return {
    lazy: async () => {
      const Page = await load()
      return { Component: guard ? () => guard(<Page />) : Page }
    },
  }
}

const adminOnly = (page: ReactNode) => <RequireRole role="admin">{page}</RequireRole>
const loadBookForm = () => import('./features/books/BookFormPage').then((m) => m.BookFormPage)

export const routes: RouteObject[] = [
  {
    element: <Layout />,
    HydrateFallback: Spinner,
    children: [
      { index: true, element: <LibraryPage /> },
      { path: 'books/new', ...lazyPage(loadBookForm, adminOnly) },
      { path: 'books/:id', ...lazyPage(() => import('./features/books/BookDetailPage').then((m) => m.BookDetailPage)) },
      { path: 'books/:id/edit', ...lazyPage(loadBookForm, adminOnly) },
      {
        path: 'favourites',
        ...lazyPage(
          () => import('./features/favourites/FavouritesPage').then((m) => m.FavouritesPage),
          (page) => <RequireAuth>{page}</RequireAuth>,
        ),
      },
      { path: 'login', ...lazyPage(() => import('./features/auth/LoginPage').then((m) => m.LoginPage)) },
      { path: 'register', ...lazyPage(() => import('./features/auth/RegisterPage').then((m) => m.RegisterPage)) },
      { path: '*', ...lazyPage(() => import('./features/notfound/NotFoundPage').then((m) => m.NotFoundPage)) },
    ],
  },
]
