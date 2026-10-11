import { describe, expect, it } from 'vitest'
import { coverSrc } from './coverSrc'

describe('coverSrc', () => {
  it('leaves self-hosted covers unchanged', () => {
    expect(coverSrc('/covers/123.jpg')).toBe('/covers/123.jpg')
  })

  it('asks Open Library for a 404 instead of a placeholder', () => {
    expect(coverSrc('https://covers.openlibrary.org/b/id/1-M.jpg')).toBe(
      'https://covers.openlibrary.org/b/id/1-M.jpg?default=false',
    )
  })
})
