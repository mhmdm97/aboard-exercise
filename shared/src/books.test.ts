import { describe, expect, it } from 'vitest'
import { bookInputSchema, bookListQuerySchema } from './books.js'

const valid = { title: '  Dune ', authorNames: [' Frank Herbert '], genreSlugs: ['science-fiction'] }

describe('bookInputSchema', () => {
  it('accepts a minimal book and normalises it', () => {
    const r = bookInputSchema.parse(valid)
    expect(r.title).toBe('Dune')
    expect(r.authorNames).toEqual(['Frank Herbert'])
    expect(r.isbn).toBeNull()
    expect(r.subtitle).toBeNull()
  })

  it('strips hyphens from ISBNs and accepts null optionals', () => {
    const r = bookInputSchema.parse({ ...valid, isbn: '978-0-441-17271-9', pageCount: null, coverUrl: null })
    expect(r.isbn).toBe('9780441172719')
    expect(r.pageCount).toBeNull()
  })

  it.each([
    ['empty title', { title: '  ' }],
    ['no authors', { authorNames: [] }],
    ['bad isbn', { isbn: '12345' }],
    ['bad url', { coverUrl: 'not a url' }],
    ['future year', { publishedYear: 9999 }],
    ['rating too high', { averageRating: 5.5 }],
    ['zero pages', { pageCount: 0 }],
    ['too many genres', { genreSlugs: Array.from({ length: 11 }, (_, i) => `g${i}`) }],
  ])('rejects %s', (_name, patch) => {
    expect(bookInputSchema.safeParse({ ...valid, ...patch }).success).toBe(false)
  })
})

describe('bookListQuerySchema', () => {
  it('applies defaults', () => {
    expect(bookListQuerySchema.parse({})).toMatchObject({ order: 'asc', page: 1, pageSize: 24 })
    expect(bookListQuerySchema.parse({}).sort).toBeUndefined()
  })

  it('coerces numbers and splits genres', () => {
    const r = bookListQuerySchema.parse({ genre: ['a,b', 'c'], yearFrom: '1990', minRating: '4.5', page: '2' })
    expect(r).toMatchObject({ genre: ['a', 'b', 'c'], yearFrom: 1990, minRating: 4.5, page: 2 })
    expect(bookListQuerySchema.parse({ genre: 'fantasy' }).genre).toEqual(['fantasy'])
  })

  it.each([{ page: '0' }, { pageSize: '101' }, { sort: 'bogus' }, { author: 'nope' }, { minRating: '6' }])(
    'rejects %j',
    (q) => {
      expect(bookListQuerySchema.safeParse(q).success).toBe(false)
    },
  )
})
