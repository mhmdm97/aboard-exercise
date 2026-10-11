/**
 * Bookcloth palette for generated covers. Every colour has >= 6.7:1 contrast against white
 * (WCAG AA needs 4.5:1); the same colours are used in light and dark mode on purpose.
 */
export const COVER_PALETTE = [
  '#7A2832', // oxblood
  '#2E4F3E', // forest
  '#233A5E', // navy
  '#7A5418', // ochre
  '#57304F', // plum
  '#1F5257', // teal
  '#3B4452', // slate
  '#8A3B1E', // rust
  '#4A5524', // moss
  '#3A3470', // indigo
  '#5A3A2A', // umber
  '#1E4A6B', // petrol
] as const

/** djb2 over the title, folded onto the palette: stable per title. */
export function coverColorIndex(title: string): number {
  let hash = 5381
  for (const ch of title) hash = ((hash << 5) + hash + ch.charCodeAt(0)) | 0
  return Math.abs(hash) % COVER_PALETTE.length
}

export function coverColor(title: string): string {
  return COVER_PALETTE[coverColorIndex(title)]
}

/** One author as-is, several as "First et al." so it fits on the cover. */
export function coverAuthorLabel(authorNames: string[]): string {
  if (authorNames.length === 0) return ''
  return authorNames.length > 1 ? `${authorNames[0]} et al.` : authorNames[0]
}
