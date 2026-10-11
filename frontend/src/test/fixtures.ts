import type { BookDto } from '@library/shared'

export const sampleBook: BookDto = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Dune',
  subtitle: null,
  description: null,
  isbn: '9780441172719',
  coverUrl: 'https://covers.openlibrary.org/b/isbn/9780441172719-M.jpg',
  publishedYear: 1965,
  pageCount: 412,
  averageRating: 4.25,
  authors: [{ id: '22222222-2222-4222-8222-222222222222', name: 'Frank Herbert' }],
  genres: [
    { id: '33333333-3333-4333-8333-333333333331', name: 'Science Fiction', slug: 'sci-fi' },
    { id: '33333333-3333-4333-8333-333333333332', name: 'Classics', slug: 'classics' },
    { id: '33333333-3333-4333-8333-333333333333', name: 'Adventure', slug: 'adventure' },
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}
