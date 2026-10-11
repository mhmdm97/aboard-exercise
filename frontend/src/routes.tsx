import type { RouteObject } from 'react-router'
import { Layout } from './components/Layout/Layout'
import { LoginPage } from './features/auth/LoginPage'
import { RegisterPage } from './features/auth/RegisterPage'
import { BookDetailPage } from './features/books/BookDetailPage'
import { BookFormPage } from './features/books/BookFormPage'
import { LibraryPage } from './features/library/LibraryPage'
import { NotFoundPage } from './features/notfound/NotFoundPage'

export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { index: true, element: <LibraryPage /> },
      { path: 'books/new', element: <BookFormPage /> },
      { path: 'books/:id', element: <BookDetailPage /> },
      { path: 'books/:id/edit', element: <BookFormPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
