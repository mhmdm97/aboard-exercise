import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { sampleBook } from '../../test/fixtures'
import { renderWithProviders } from '../../test/renderWithProviders'
import { BookCard } from './BookCard'
import { coverSrc } from './coverSrc'

describe('BookCard', () => {
  it('renders title, authors, year, rating, at most two genres and links to the detail page', () => {
    renderWithProviders(<BookCard book={sampleBook} />)
    expect(screen.getByRole('heading', { name: 'Dune' })).toBeInTheDocument()
    expect(screen.getByText('Frank Herbert')).toBeInTheDocument()
    expect(screen.getByText('1965')).toBeInTheDocument()
    expect(screen.getByText('★ 4.3')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByRole('link')).toHaveAttribute('href', `/books/${sampleBook.id}`)
    const img = screen.getByAltText('Cover of Dune')
    expect(img).toHaveAttribute('loading', 'lazy')
    expect(img.getAttribute('src')).toContain('default=false')
  })

  it('falls back to a styled cover when the image fails', () => {
    renderWithProviders(<BookCard book={sampleBook} />)
    fireEvent.error(screen.getByAltText('Cover of Dune'))
    expect(screen.queryByAltText('Cover of Dune')).not.toBeInTheDocument()
    expect(screen.getByTestId('fallback-cover')).toHaveTextContent('Dune')
  })

  it('uses the fallback when there is no cover url', () => {
    renderWithProviders(<BookCard book={{ ...sampleBook, coverUrl: null, averageRating: null }} />)
    expect(screen.getByTestId('fallback-cover')).toBeInTheDocument()
    expect(screen.getByText('Not rated')).toBeInTheDocument()
  })
})

describe('coverSrc', () => {
  it('only touches Open Library urls', () => {
    expect(coverSrc('https://example.com/a.jpg')).toBe('https://example.com/a.jpg')
    expect(coverSrc('https://covers.openlibrary.org/b/isbn/1-M.jpg?default=false')).toBe(
      'https://covers.openlibrary.org/b/isbn/1-M.jpg?default=false',
    )
  })
})
