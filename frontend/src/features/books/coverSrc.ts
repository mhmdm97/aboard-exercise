/** Open Library returns a 1x1 placeholder for unknown ISBNs unless `default=false` is set. */
export function coverSrc(url: string): string {
  if (!url.includes('covers.openlibrary.org') || url.includes('default=')) return url
  return `${url}${url.includes('?') ? '&' : '?'}default=false`
}
