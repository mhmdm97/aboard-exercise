import type { RouteObject } from 'react-router'
import { RequireAuth, RequireRole } from './components/RequireAuth/RequireAuth'
import { Layout } from './components/Layout/Layout'
import { LoginPage } from './features/auth/LoginPage'
import { RegisterPage } from './features/auth/RegisterPage'
import { BookDetailPage } from './features/books/BookDetailPage'
import { BookFormPage } from './features/books/BookFormPage'
import { FavouritesPage } from './features/favourites/FavouritesPage'
import { LibraryPage } from './features/library/LibraryPage'
import { NotFoundPage } from './features/notfound/NotFoundPage'

export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { index: true, element: <LibraryPage /> },
      {
        path: 'books/new',
        element: (
          <RequireRole role="admin">
            <BookFormPage />
          </RequireRole>
        ),
      },
      { path: 'books/:id', element: <BookDetailPage /> },
      {
        path: 'books/:id/edit',
        element: (
          <RequireRole role="admin">
            <BookFormPage />
          </RequireRole>
        ),
      },
      {
        path: 'favourites',
        element: (
          <RequireAuth>
            <FavouritesPage />
          </RequireAuth>
        ),
      },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
