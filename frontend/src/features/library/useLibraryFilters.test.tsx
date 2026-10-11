import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, useLocation } from 'react-router'
import { describe, expect, it } from 'vitest'
import { parseFilters, serializeFilters, useLibraryFilters } from './useLibraryFilters'

describe('parseFilters / serializeFilters', () => {
  it('parses repeated genre params and numbers', () => {
    const f = parseFilters(
      new URLSearchParams('q=dune&genre=sci-fi&genre=fantasy&yearFrom=1900&minRating=4&sort=year&order=desc'),
    )
    expect(f).toEqual({
      q: 'dune',
      genres: ['sci-fi', 'fantasy'],
      yearFrom: 1900,
      yearTo: undefined,
      minRating: 4,
      sort: 'year',
      order: 'desc',
    })
  })

  it('round-trips the author id', () => {
    const id = '22222222-2222-4222-8222-222222222222'
    const filters = parseFilters(new URLSearchParams(`author=${id}`))
    expect(filters.author).toBe(id)
    expect(serializeFilters(filters).toString()).toBe(`author=${id}`)
  })

  it('ignores invalid values', () => {
    const f = parseFilters(new URLSearchParams('sort=bogus&order=up&yearFrom=abc'))
    expect(f.sort).toBeUndefined()
    expect(f.order).toBeUndefined()
    expect(f.yearFrom).toBeUndefined()
  })

  it('round-trips and omits empty values', () => {
    const filters = parseFilters(new URLSearchParams('genre=a&genre=b&sort=title'))
    expect(serializeFilters(filters).toString()).toBe('genre=a&genre=b&sort=title')
    expect(serializeFilters(parseFilters(new URLSearchParams())).toString()).toBe('')
  })
})

describe('useLibraryFilters', () => {
  function setup(initial: string) {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={[initial]}>{children}</MemoryRouter>
    )
    return renderHook(() => ({ lib: useLibraryFilters(), location: useLocation() }), { wrapper })
  }

  it('reads filters from the URL and writes patches back', () => {
    const { result } = setup('/?genre=a&genre=b')
    expect(result.current.lib.filters.genres).toEqual(['a', 'b'])
    expect(result.current.lib.activeCount).toBe(2)

    act(() => result.current.lib.setFilters({ q: 'war', minRating: 4 }))
    expect(result.current.location.search).toBe('?q=war&genre=a&genre=b&minRating=4')
  })

  it('clears everything', () => {
    const { result } = setup('/?q=x&genre=a')
    act(() => result.current.lib.clearFilters())
    expect(result.current.location.search).toBe('')
  })
})
