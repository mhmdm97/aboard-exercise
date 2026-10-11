import { describe, expect, it } from 'vitest'
import { COVER_PALETTE, coverAuthorLabel, coverColor, coverColorIndex } from './coverStyle'

/** WCAG relative luminance of a #rrggbb colour. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const contrastWithWhite = (hex: string) => 1.05 / (luminance(hex) + 0.05)

describe('cover colour', () => {
  it('is deterministic and always inside the palette', () => {
    for (const title of ['Dune', 'The Hobbit', 'Good Omens', 'Émile', '', '日本語', 'a'.repeat(500)]) {
      const index = coverColorIndex(title)
      expect(index).toBe(coverColorIndex(title))
      expect(index).toBeGreaterThanOrEqual(0)
      expect(index).toBeLessThan(COVER_PALETTE.length)
      expect(coverColor(title)).toBe(COVER_PALETTE[index])
    }
  })

  it('matches the design reference hashes', () => {
    // Values from the design mockup's own hash function (djb2 % 12), so covers match the spec.
    expect(coverColorIndex('Circe')).toBe(7)
    expect(coverColorIndex('Dune')).toBe(1)
    expect(coverColorIndex('The Hobbit')).toBe(2)
  })

  it('spreads titles across the palette', () => {
    const titles = Array.from({ length: 200 }, (_, i) => `Book number ${i}`)
    expect(new Set(titles.map(coverColorIndex)).size).toBeGreaterThanOrEqual(10)
  })

  it('gives white text at least WCAG AA contrast on every cloth colour', () => {
    for (const hex of COVER_PALETTE) {
      expect(contrastWithWhite(hex), hex).toBeGreaterThanOrEqual(4.5)
      // the author line is white at 92% alpha: blend it over the cloth first
      const blend = (c: number) => Math.round(255 * 0.92 + c * 0.08)
      const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
      const blended = `#${channels.map((c) => blend(c).toString(16).padStart(2, '0')).join('')}`
      expect(luminance(blended) + 0.05).toBeGreaterThan(0) // sanity
      const ratio = (luminance(blended) + 0.05) / (luminance(hex) + 0.05)
      expect(ratio, `${hex} author line`).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe('coverAuthorLabel', () => {
  it('shows one author as-is and several as "First et al."', () => {
    expect(coverAuthorLabel([])).toBe('')
    expect(coverAuthorLabel(['Frank Herbert'])).toBe('Frank Herbert')
    expect(coverAuthorLabel(['Terry Pratchett', 'Neil Gaiman'])).toBe('Terry Pratchett et al.')
  })
})
