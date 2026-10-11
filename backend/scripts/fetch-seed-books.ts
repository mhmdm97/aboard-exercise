/**
 * Builds backend/src/db/seed/books.json from Open Library.
 *
 *   npm run seed:fetch -w @library/backend
 *
 * Needs internet; normal development does not (the JSON is committed). Requests are limited
 * to 1 per second, and successful responses are cached in backend/.cache/openlibrary/, so
 * re-runs are fast and deterministic.
 */
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const BACKEND_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CACHE_DIR = path.join(BACKEND_DIR, '.cache', 'openlibrary')
const OUTPUT = path.join(BACKEND_DIR, 'src', 'db', 'seed', 'books.json')
const USER_AGENT = 'abroad-exercise-seed/1.0 (https://github.com/mhmdm97/abroad-exercise)'
const MIN_INTERVAL_MS = 1100
const FIELDS =
  'key,title,subtitle,author_name,first_publish_year,number_of_pages_median,isbn,cover_i,ratings_average,ratings_count,edition_count,readinglog_count,subject,language'

const PER_GENRE_PICKS = 16 // primary picks per genre, on top of the must-have titles
const SEARCH_LIMIT = 100
const MAX_GENRES_PER_BOOK = 3
const MIN_RATINGS = 5
const MIN_SECONDARY_HITS = 3 // subject matches needed to add a genre besides the queried one

// ---------------------------------------------------------------------------------------------
// Genre configuration
// ---------------------------------------------------------------------------------------------

interface GenreConfig {
  name: string
  /** Open Library subjects queried for this genre. */
  subjects: string[]
  /** Case-insensitive patterns matched against a book's OL subject strings. */
  patterns: RegExp[]
}

const GENRES: GenreConfig[] = [
  { name: 'Fantasy', subjects: ['fantasy'], patterns: [/fantasy/] },
  { name: 'Young Adult', subjects: ['young_adult_fiction'], patterns: [/young adult/, /teen/] },
  { name: 'Classics', subjects: ['classic_literature', 'classics'], patterns: [/classic/] },
  { name: 'Humour', subjects: ['humor'], patterns: [/humou?r/, /satire/] },
  { name: 'Historical Fiction', subjects: ['historical_fiction'], patterns: [/historical fiction/] },
  { name: 'Romance', subjects: ['romance'], patterns: [/romance/, /love stories/] },
  { name: 'Science Fiction', subjects: ['science_fiction'], patterns: [/science fiction/, /sci-fi/] },
  { name: 'Mystery', subjects: ['mystery'], patterns: [/mystery/, /detective/] },
  { name: 'Dystopian', subjects: ['dystopia'], patterns: [/dystopi/] },
  { name: 'Horror', subjects: ['horror'], patterns: [/horror/, /vampire/, /gothic/] },
  { name: 'Adventure', subjects: ['adventure'], patterns: [/adventure/] },
  { name: 'Literary Fiction', subjects: ['literary_fiction'], patterns: [/literary/] },
  { name: 'Thriller', subjects: ['thriller'], patterns: [/thriller/, /suspense/, /\bspy\b/] },
  { name: 'Philosophy', subjects: ['philosophy'], patterns: [/philosoph/] },
  { name: 'Poetry', subjects: ['poetry'], patterns: [/poetry/, /poems/] },
  {
    name: 'History',
    subjects: ['history'],
    patterns: [/^history$/, /^history, /, /^world history/, /^(ancient|modern|european|american) history/],
  },
  { name: 'Non-Fiction', subjects: ['nonfiction'], patterns: [/non-?fiction/] },
  {
    name: 'Science',
    subjects: ['science'],
    patterns: [/^science\b(?! fiction)/, /^physics/, /^biology/, /^astronomy/, /^cosmology/],
  },
  { name: 'Biography', subjects: ['biography'], patterns: [/^biography/, /^autobiography/, /^memoirs?$/] },
  { name: 'Business', subjects: ['business'], patterns: [/^business/, /^economics/, /^entrepreneurship/, /^management/] },
  {
    name: 'Self-Help',
    subjects: ['self-help'],
    patterns: [/self-help/, /self help/, /self-improvement/, /personal development/, /habits/],
  },
]

interface MustHave {
  title: string
  author: string
  /** Explicit genres (max 3, fixed names): subject mapping is unreliable for famous titles. */
  genres: string[]
}

const MUST_HAVES: MustHave[] = [
  { title: 'The Hobbit', author: 'Tolkien', genres: ['Fantasy', 'Adventure', 'Classics'] },
  { title: 'The Fellowship of the Ring', author: 'Tolkien', genres: ['Fantasy', 'Adventure', 'Classics'] },
  { title: 'The Two Towers', author: 'Tolkien', genres: ['Fantasy', 'Adventure', 'Classics'] },
  { title: 'The Return of the King', author: 'Tolkien', genres: ['Fantasy', 'Adventure', 'Classics'] },
  { title: 'Pride and Prejudice', author: 'Austen', genres: ['Romance', 'Classics'] },
  { title: 'Emma', author: 'Austen', genres: ['Romance', 'Classics'] },
  { title: 'Sense and Sensibility', author: 'Austen', genres: ['Romance', 'Classics'] },
  { title: 'Nineteen Eighty-Four', author: 'Orwell', genres: ['Dystopian', 'Classics', 'Science Fiction'] },
  { title: 'Animal Farm', author: 'Orwell', genres: ['Classics', 'Dystopian'] },
  { title: "Harry Potter and the Philosopher's Stone", author: 'Rowling', genres: ['Fantasy', 'Young Adult'] },
  { title: 'Harry Potter and the Chamber of Secrets', author: 'Rowling', genres: ['Fantasy', 'Young Adult'] },
  { title: 'Harry Potter and the Prisoner of Azkaban', author: 'Rowling', genres: ['Fantasy', 'Young Adult'] },
  { title: 'Dune', author: 'Herbert', genres: ['Science Fiction', 'Adventure'] },
  { title: 'A Wizard of Earthsea', author: 'Le Guin', genres: ['Fantasy', 'Young Adult'] },
  { title: 'The Left Hand of Darkness', author: 'Le Guin', genres: ['Science Fiction', 'Literary Fiction'] },
  { title: 'The Dispossessed', author: 'Le Guin', genres: ['Science Fiction', 'Literary Fiction'] },
  { title: 'Murder on the Orient Express', author: 'Agatha Christie', genres: ['Mystery', 'Classics'] },
  { title: 'And Then There Were None', author: 'Christie', genres: ['Mystery', 'Classics'] },
  { title: 'The Murder of Roger Ackroyd', author: 'Christie', genres: ['Mystery', 'Classics'] },
  { title: 'Good Omens', author: 'Gaiman', genres: ['Fantasy', 'Humour'] },
  { title: 'The Great Gatsby', author: 'Fitzgerald', genres: ['Classics', 'Literary Fiction'] },
  { title: 'To Kill a Mockingbird', author: 'Harper Lee', genres: ['Classics', 'Literary Fiction'] },
  { title: 'Brave New World', author: 'Huxley', genres: ['Dystopian', 'Classics', 'Science Fiction'] },
  { title: 'Frankenstein', author: 'Shelley', genres: ['Horror', 'Classics', 'Science Fiction'] },
  { title: 'Dracula', author: 'Stoker', genres: ['Horror', 'Classics'] },
  { title: 'Jane Eyre', author: 'Bronte', genres: ['Romance', 'Classics'] },
  { title: 'Wuthering Heights', author: 'Bronte', genres: ['Romance', 'Classics'] },
  { title: 'Moby Dick', author: 'Melville', genres: ['Classics', 'Adventure'] },
  { title: "The Hitchhiker's Guide to the Galaxy", author: 'Douglas Adams', genres: ['Science Fiction', 'Humour', 'Adventure'] },
  { title: 'Fahrenheit 451', author: 'Bradbury', genres: ['Dystopian', 'Science Fiction', 'Classics'] },
  { title: "The Handmaid's Tale", author: 'Atwood', genres: ['Dystopian', 'Literary Fiction', 'Classics'] },
  { title: 'Sapiens', author: 'Harari', genres: ['History', 'Non-Fiction'] },
  { title: 'A Brief History of Time', author: 'Hawking', genres: ['Science', 'Non-Fiction'] },
  { title: 'The Catcher in the Rye', author: 'Salinger', genres: ['Classics', 'Literary Fiction'] },
  { title: 'Crime and Punishment', author: 'Dostoyevsky', genres: ['Classics', 'Literary Fiction'] },
  { title: 'The Lion, the Witch and the Wardrobe', author: 'Lewis', genres: ['Fantasy', 'Young Adult', 'Classics'] },
  { title: 'The Diary of a Young Girl', author: 'Frank', genres: ['Biography', 'History'] },
  { title: 'Meditations', author: 'Marcus Aurelius', genres: ['Philosophy', 'Classics'] },
  { title: 'The Art of War', author: 'Sun Tzu', genres: ['Philosophy', 'History'] },
  { title: 'How to Win Friends and Influence People', author: 'Carnegie', genres: ['Self-Help', 'Business'] },
  { title: 'Atomic Habits', author: 'James Clear', genres: ['Self-Help', 'Non-Fiction'] },
  { title: 'The Hunger Games', author: 'Suzanne Collins', genres: ['Dystopian', 'Young Adult', 'Science Fiction'] },
  { title: 'The Da Vinci Code', author: 'Dan Brown', genres: ['Thriller', 'Mystery'] },
  { title: 'The Silence of the Lambs', author: 'Thomas Harris', genres: ['Thriller', 'Horror'] },
  { title: 'The Odyssey', author: 'Homer', genres: ['Classics', 'Poetry', 'Adventure'] },
  { title: 'Leaves of Grass', author: 'Whitman', genres: ['Poetry', 'Classics'] },
  { title: 'Cosmos', author: 'Carl Sagan', genres: ['Science', 'Non-Fiction'] },
]

// ---------------------------------------------------------------------------------------------
// HTTP: 1 request/second, retries, on-disk cache of successful responses
// ---------------------------------------------------------------------------------------------

let lastRequestAt = 0
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function getJson<T>(url: string): Promise<T> {
  const cacheFile = path.join(CACHE_DIR, `${createHash('sha1').update(url).digest('hex')}.json`)
  try {
    return JSON.parse(await readFile(cacheFile, 'utf8')) as T
  } catch {
    // not cached
  }
  for (let attempt = 0; attempt < 6; attempt++) {
    const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now()
    if (wait > 0) await sleep(wait)
    lastRequestAt = Date.now()
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } })
      if (res.ok) {
        const body = await res.text()
        const parsed = JSON.parse(body) as T
        await mkdir(CACHE_DIR, { recursive: true })
        await writeFile(cacheFile, body)
        return parsed
      }
      if (res.status !== 429 && res.status < 500) throw new Error(`HTTP ${res.status} for ${url}`)
      console.warn(`HTTP ${res.status}, retrying (${attempt + 1}/6): ${url}`)
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('HTTP ')) throw err
      console.warn(`Request failed, retrying (${attempt + 1}/6): ${String(err)}`)
    }
    await sleep(2 ** (attempt + 1) * 1000)
  }
  throw new Error(`Giving up on ${url}`)
}

// ---------------------------------------------------------------------------------------------
// Open Library types and helpers
// ---------------------------------------------------------------------------------------------

interface OlDoc {
  key: string
  title: string
  subtitle?: string
  author_name?: string[]
  first_publish_year?: number
  number_of_pages_median?: number
  isbn?: string[]
  cover_i?: number
  ratings_average?: number
  ratings_count?: number
  edition_count?: number
  readinglog_count?: number
  subject?: string[]
  language?: string[]
}

interface SearchResponse {
  docs: OlDoc[]
}

const searchUrl = (query: string) => `https://openlibrary.org/search.json?${query}&fields=${FIELDS}`

const JUNK_TITLE =
  /summary|study guide|sparknotes|cliffsnotes|box(ed)? set|collection|omnibus|books? 1-|workbook|analysis|a novel by|\bcomplete\b|\bsampler\b|\bcompanion\b|^novels\b|bachman books|graphic novel|mein kampf|\[\d+ (novels|stories)|\)\s*\/\s*|\w \/ \w/i

/** Titles in other scripts, or with common German/French/Spanish/Italian function words. */
const NON_ENGLISH_TITLE = /[^\p{Script=Latin}\P{L}]|\b(und|der|das|het|trotzdem|les|des|une|della|los|las|el|del|le|la|verden|bumi|cien|culpa|alquimista|gorin)\b/iu

/** Religious scripture is not what this library is about. */
const SCRIPTURE = /\b(bible|quran|koran|torah|talmud|vedas?|bhagavad|gita|testament)\b/i

/** Textbooks: a single generic academic word, or a "Principles of ..." style title. */
const GENERIC_TEXTBOOK_TITLE =
  /^(micro|macro)?(biology|chemistry|physics|economics|psychology|sociology|calculus|algebra|geometry|statistics|anatomy|physiology|genetics|biochemistry|science|history|mathematics|geography|astronomy)$|^(principles|fundamentals|introduction|essentials) of /i

/** Accented letters in a title almost always mean a translated edition (kept apart: /i would fold ſ into s). */
const ACCENTED_LETTER = /[À-ɏ]/

function isbn13CheckDigit(first12: string): string {
  let sum = 0
  for (let i = 0; i < 12; i++) sum += Number(first12[i]) * (i % 2 === 0 ? 1 : 3)
  return String((10 - (sum % 10)) % 10)
}

/** Returns a valid ISBN-13 (978/979 prefix) or null. Converts valid ISBN-10s. */
function toIsbn13(raw: string): string | null {
  const s = raw.replace(/[-\s]/g, '').toUpperCase()
  if (/^\d{13}$/.test(s)) {
    return /^97[89]/.test(s) && isbn13CheckDigit(s.slice(0, 12)) === s[12] ? s : null
  }
  if (/^\d{9}[\dX]$/.test(s)) {
    let sum = 0
    for (let i = 0; i < 10; i++) sum += (s[i] === 'X' ? 10 : Number(s[i])) * (10 - i)
    if (sum % 11 !== 0) return null
    const body = `978${s.slice(0, 9)}`
    return body + isbn13CheckDigit(body)
  }
  return null
}

function pickIsbn(doc: OlDoc, used: Set<string>): string | null {
  const all = [...new Set((doc.isbn ?? []).map(toIsbn13).filter((v): v is string => v !== null))].sort()
  return all.find((i) => !used.has(i)) ?? null
}

function isUsable(doc: OlDoc): boolean {
  if (!doc.cover_i || !doc.author_name?.length || !doc.first_publish_year) return false
  if (doc.first_publish_year > new Date().getFullYear()) return false
  if (JUNK_TITLE.test(doc.title) || (doc.subtitle && JUNK_TITLE.test(doc.subtitle))) return false
  if (doc.language && !doc.language.includes('eng')) return false
  if (NON_ENGLISH_TITLE.test(doc.title) || ACCENTED_LETTER.test(doc.title)) return false
  if (SCRIPTURE.test(doc.title) || SCRIPTURE.test(doc.author_name.join(' '))) return false
  if (GENERIC_TEXTBOOK_TITLE.test(doc.title) || doc.subject?.some((x) => /textbook/i.test(x))) return false
  return true
}

const normalise = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const byPopularity = (a: OlDoc, b: OlDoc) =>
  (b.readinglog_count ?? 0) - (a.readinglog_count ?? 0) || (b.edition_count ?? 0) - (a.edition_count ?? 0)

function mapGenres(doc: OlDoc, queried?: string): string[] {
  const subjects = (doc.subject ?? []).map((s) => s.toLowerCase())
  const scored = GENRES.map((g, index) => ({
    name: g.name,
    index,
    hits: subjects.filter((s) => g.patterns.some((p) => p.test(s))).length,
  }))
    .filter((g) => g.hits >= MIN_SECONDARY_HITS && g.name !== queried)
    .sort((a, b) => b.hits - a.hits || a.index - b.index)
    .map((g) => g.name)
  return [...(queried ? [queried] : []), ...scored].slice(0, MAX_GENRES_PER_BOOK)
}

// ---------------------------------------------------------------------------------------------
// Description cleaning
// ---------------------------------------------------------------------------------------------

function cleanDescription(raw: unknown): string {
  const text = typeof raw === 'string' ? raw : raw && typeof raw === 'object' && 'value' in raw ? String(raw.value) : ''
  let s = text.replace(/\r/g, '')
  s = s.split(/\n\s*-{3,}/)[0] ?? ''
  s = s.split(/-{4,}/)[0] ?? ''
  s = s.split(/\n\s*Contains:/i)[0] ?? ''
  s = s.replace(/^\s*\[\d+\]:.*$/gm, '')
  s = s.replace(/\(\s*\[source\]\[\d*\]\s*\)/gi, '')
  s = s.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
  s = s.replace(/\[([^\]]+)\]\[\d*\]/g, '$1')
  s = s.replace(/\(\s*source\s*\)/gi, '')
  s = s.replace(/^from wikipedia:\s*/i, '')
  s = s.replace(/\[\d+\]/g, '')
  s = s.replace(/\(\s*\/[^)]*\/\s*\)/g, '')
  s = s.replace(/\[[^\]]*\]/g, '')
  s = s.replace(/<[^>]+>/g, ' ')
  s = s.replace(/https?:\/\/\S+/g, '')
  s = s.replace(/^\s*#+\s*/gm, '')
  s = s.replace(/\*+/g, '')
  s = s.replace(/(^|\W)_+|_+(?=\W|$)/g, '$1')
  s = s.replace(/\s+/g, ' ').trim()

  const sentences = s.split(/(?<=[.!?]["'”’)]?)\s+(?=["'“‘(]?[A-Z0-9])/)
  let out = ''
  let count = 0
  for (const sentence of sentences) {
    const next = out ? `${out} ${sentence}` : sentence
    if (count >= 3 || next.length > 400) break
    out = next
    count++
  }
  if (!out && s) {
    const cut = s.slice(0, 397)
    out = `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 1))}…`
  }
  return out.length >= 20 ? out : ''
}

// ---------------------------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------------------------

interface SeedOut {
  title: string
  subtitle?: string
  authors: string[]
  isbn: string
  publishedYear: number
  pageCount?: number
  description: string
  genres: string[]
  coverUrl: string
  averageRating?: number
}

interface Picked {
  doc: OlDoc
  isbn: string
  genres: string[]
}

async function main() {
  const used = new Set<string>()
  const usedWorks = new Set<string>()
  const usedTitles = new Set<string>()
  const picked: Picked[] = []

  const tryAdd = (doc: OlDoc, genres: string[]): boolean => {
    const titleKey = `${normalise(doc.title)}|${normalise(doc.author_name?.[0] ?? '')}`
    if (usedWorks.has(doc.key) || usedTitles.has(titleKey) || !isUsable(doc)) return false
    const isbn = pickIsbn(doc, used)
    if (!isbn || genres.length === 0) return false
    used.add(isbn)
    usedWorks.add(doc.key)
    usedTitles.add(titleKey)
    picked.push({ doc, isbn, genres })
    return true
  }

  // 1. Must-have titles.
  const missing: string[] = []
  for (const m of MUST_HAVES) {
    const res = await getJson<SearchResponse>(
      searchUrl(`title=${encodeURIComponent(m.title)}&author=${encodeURIComponent(m.author)}&limit=10`),
    )
    const wanted = normalise(m.title)
    // Exact title matches first (avoids parodies and adaptations), then titles that contain it.
    const matches = res.docs.filter((d) => normalise(d.title).includes(wanted)).sort(byPopularity)
    const candidates = [...matches.filter((d) => normalise(d.title) === wanted), ...matches]
    if (!candidates.some((d) => tryAdd(d, m.genres))) missing.push(m.title)
  }

  // 2. Per-genre candidate pools, then round-robin picks so popular crossovers are not hoarded.
  const pools = new Map<string, OlDoc[]>()
  for (const g of GENRES) {
    const docs: OlDoc[] = []
    for (const subject of g.subjects) {
      const res = await getJson<SearchResponse>(
        searchUrl(`subject=${encodeURIComponent(subject)}&lang=en&sort=readinglog&limit=${SEARCH_LIMIT}`),
      )
      docs.push(...res.docs)
    }
    pools.set(g.name, docs.filter(isUsable).sort(byPopularity))
  }
  const taken = new Map(GENRES.map((g) => [g.name, 0]))
  const cursor = new Map(GENRES.map((g) => [g.name, 0]))
  for (let progress = true; progress; ) {
    progress = false
    for (const g of GENRES) {
      if (taken.get(g.name)! >= PER_GENRE_PICKS) continue
      const pool = pools.get(g.name)!
      let i = cursor.get(g.name)!
      while (i < pool.length) {
        const doc = pool[i++]!
        if (tryAdd(doc, mapGenres(doc, g.name))) {
          taken.set(g.name, taken.get(g.name)! + 1)
          progress = true
          break
        }
      }
      cursor.set(g.name, i)
    }
  }

  // 3. Descriptions from the works endpoint.
  const books: SeedOut[] = []
  for (const [n, { doc, isbn, genres }] of picked.entries()) {
    const work = await getJson<{ description?: unknown }>(`https://openlibrary.org${doc.key}.json`)
    const authors = [...new Set(doc.author_name!)].slice(0, 3)
    const description =
      cleanDescription(work.description) || `${doc.title} by ${authors[0]}, first published in ${doc.first_publish_year}.`
    const rated = doc.ratings_average !== undefined && (doc.ratings_count ?? 0) >= MIN_RATINGS
    books.push({
      title: doc.title,
      ...(doc.subtitle ? { subtitle: doc.subtitle } : {}),
      authors,
      isbn,
      publishedYear: doc.first_publish_year!,
      ...(doc.number_of_pages_median ? { pageCount: doc.number_of_pages_median } : {}),
      description,
      genres,
      coverUrl: `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`,
      ...(rated ? { averageRating: Math.min(5, Math.max(0, Math.round(doc.ratings_average! * 100) / 100)) } : {}),
    })
    if ((n + 1) % 50 === 0) console.log(`descriptions: ${n + 1}/${picked.length}`)
  }

  books.sort((a, b) => (a.title < b.title ? -1 : a.title > b.title ? 1 : a.isbn < b.isbn ? -1 : a.isbn > b.isbn ? 1 : 0))
  await mkdir(path.dirname(OUTPUT), { recursive: true })
  await writeFile(OUTPUT, `${JSON.stringify(books, null, 2)}\n`)

  const perGenre = Object.fromEntries(GENRES.map((g) => [g.name, books.filter((b) => b.genres.includes(g.name)).length]))
  console.log(`Wrote ${books.length} books to ${OUTPUT}`)
  console.log('Per genre:', perGenre)
  console.log(`With real ratings: ${books.filter((b) => 'averageRating' in b).length}/${books.length}`)
  console.log(`Must-haves not found: ${missing.length ? missing.join('; ') : 'none'}`)
}

await main()
