/**
 * Builds backend/src/db/seed/books.json from Open Library.
 *
 *   npm run seed:fetch -w @library/backend
 *
 * Needs internet; normal development does not (the JSON is committed). Requests are limited
 * to 1 per second, and successful responses are cached in backend/.cache/openlibrary/, so
 * re-runs are fast and deterministic. Covers themselves come from `npm run seed:covers`; books
 * whose cover file already exists keep their local /covers/<id>.jpg URL.
 */
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const BACKEND_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CACHE_DIR = path.join(BACKEND_DIR, '.cache', 'openlibrary')
const COVERS_DIR = path.resolve(BACKEND_DIR, '..', 'frontend', 'public', 'covers') // filled by seed:covers
const OUTPUT = path.join(BACKEND_DIR, 'src', 'db', 'seed', 'books.json')
const USER_AGENT = 'abroad-exercise-seed/1.0 (https://github.com/mhmdm97/abroad-exercise)'
const MIN_INTERVAL_MS = 1100
const FIELDS =
  'key,title,subtitle,author_name,first_publish_year,number_of_pages_median,isbn,cover_i,ratings_average,ratings_count,edition_count,readinglog_count,subject,language'

const PER_GENRE_PICKS = 16 // primary picks per genre, on top of the must-have titles
const SEARCH_LIMIT = 150
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
    subjects: ['history', 'world_history', 'ancient_history', 'military_history'],
    patterns: [/^history$/, /^history, /, /^world history/, /^(ancient|modern|european|american) history/],
  },
  { name: 'Non-Fiction', subjects: ['nonfiction'], patterns: [/non-?fiction/] },
  {
    name: 'Science',
    subjects: ['science', 'physics', 'astronomy', 'biology', 'popular_works'],
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
  /summary|study guide|sparknotes|cliffsnotes|box(ed)? set|collection|omnibus|books? 1-|workbook|analysis|a novel by|\bcomplete\b|\bsampler\b|\bcompanion\b|^novels\b|bachman books|adaptation|graphic novel|mein kampf|\[\d+ (novels|stories)|\)\s*\/\s*|\w \/ \w/i

/** Titles in other scripts, or with common German/French/Spanish/Italian function words. */
const NON_ENGLISH_TITLE = /[^\p{Script=Latin}\P{L}]|\b(und|der|das|het|trotzdem|les|des|une|della|los|las|el|del|le|la|verden|bumi|cien|culpa|alquimista|gorin)\b/iu

/** Religious scripture is not what this library is about. */
const SCRIPTURE = /\b(bible|quran|koran|torah|talmud|vedas?|bhagavad|gita|testament)\b/i

/** Textbooks: a single generic academic word, or a "Principles of ..." style title. */
const GENERIC_TEXTBOOK_TITLE =
  /^(micro|macro)?(biology|chemistry|physics|economics|psychology|sociology|calculus|algebra|geometry|statistics|anatomy|physiology|genetics|biochemistry|science|history|mathematics|geography|astronomy)$|^(principles|fundamentals|introduction|essentials) of |^campbell biology|^concepts of physics|principia mathematica|^de rerum natura/i

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

const hasFictionSubject = (doc: OlDoc): boolean =>
  (doc.subject ?? []).some((s) => /\b(fiction|novels?)\b/i.test(s) && !/non-?fiction/i.test(s))

function isUsable(doc: OlDoc): boolean {
  if (!doc.cover_i || !doc.author_name?.length || !doc.first_publish_year) return false
  if (doc.first_publish_year > new Date().getFullYear()) return false
  if (JUNK_TITLE.test(doc.title) || (doc.subtitle && JUNK_TITLE.test(doc.subtitle))) return false
  if (doc.language && !doc.language.includes('eng')) return false
  if (NON_ENGLISH_TITLE.test(doc.title) || ACCENTED_LETTER.test(doc.title)) return false
  if (SCRIPTURE.test(doc.title) || SCRIPTURE.test(doc.author_name.join(' '))) return false
  // "Textbooks" is also a subject of graded readers of novels, so only fiction is exempt.
  const textbookSubject = doc.subject?.some((x) => /textbook/i.test(x)) && !hasFictionSubject(doc)
  if (GENERIC_TEXTBOOK_TITLE.test(doc.title) || textbookSubject) return false
  return true
}

const normalise = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const byPopularity = (a: OlDoc, b: OlDoc) =>
  (b.readinglog_count ?? 0) - (a.readinglog_count ?? 0) || (b.edition_count ?? 0) - (a.edition_count ?? 0)

const NON_FICTION_GENRES = new Set([
  'Business',
  'Science',
  'Self-Help',
  'Biography',
  'History',
  'Philosophy',
  'Non-Fiction',
])
const FIRST_SUBJECTS = 10 // a match among a book's first subjects counts as strong support

/**
 * Genres for a book found via a subject search. The queried genre is only kept when the book's
 * own subjects support it (2+ matches, or a match among its first subjects); an empty result
 * means "not confident": the caller skips the book. Non-fiction genres are never given to books
 * with a "fiction" or "novel" subject.
 */
function mapGenres(doc: OlDoc, queried?: string): string[] {
  const subjects = (doc.subject ?? []).map((s) => s.toLowerCase())
  const isFiction = hasFictionSubject(doc)
  const scored = GENRES.map((g, index) => {
    const matches = subjects.map((s, i) => (g.patterns.some((p) => p.test(s)) ? i : -1)).filter((i) => i >= 0)
    return { name: g.name, index, hits: matches.length, early: matches.some((i) => i < FIRST_SUBJECTS) }
  }).filter((g) => !(isFiction && NON_FICTION_GENRES.has(g.name)))
  const first = queried ? scored.find((g) => g.name === queried) : undefined
  if (queried && !(first && (first.hits >= 2 || first.early))) return []
  const others = scored
    .filter((g) => g.hits >= MIN_SECONDARY_HITS && g.name !== queried)
    .sort((a, b) => b.hits - a.hits || a.index - b.index)
    .map((g) => g.name)
  return [...(queried ? [queried] : []), ...others].slice(0, MAX_GENRES_PER_BOOK)
}

/** Hand-set genres keyed by Open Library work key, for books the subject mapping gets wrong. */
const GENRE_OVERRIDES: Record<string, string[]> = {
  'OL17332479W': ['Fantasy', 'Young Adult'], // Six of Crows
  'OL5720022W': ['Young Adult', 'Romance', 'Fantasy'], // Breaking Dawn
  'OL5720027W': ['Young Adult', 'Romance', 'Fantasy'], // New Moon
  'OL71056W': ['Philosophy', 'Non-Fiction'], // Mere Christianity
  'OL5749849W': ['Non-Fiction', 'Business'], // Blink
  'OL1968364W': ['Self-Help', 'Non-Fiction'], // The Art of Seduction
  'OL16085155W': ['Biography', 'Business'], // Steve Jobs
  'OL13850788W': ['Science', 'Non-Fiction'], // The Immortal Life of Henrietta Lacks
  'OL23746568W': ['Self-Help', 'Non-Fiction'], // 101 Essays That Will Change The Way You Think
  'OL1968368W': ['Self-Help', 'Business'], // The 48 Laws of Power
  'OL24620443W': ['Self-Help', 'Philosophy'], // You're Too Good to Feel This Bad
  'OL17356252W': ['Biography', 'Non-Fiction'], // When Breath Becomes Air
  'OL25799307W': ['Self-Help', 'Non-Fiction'], // Why Has Nobody Told Me This Before?
  'OL2392324W': ['Self-Help', 'Business'], // Eat That Frog! 21 Great Ways to Stop Procrastinating and Get More Done in Less Time
  'OL17710052W': ['Self-Help', 'Non-Fiction'], // Make Your Bed
  'OL1905682W': ['Biography', 'History', 'Science'], // American Prometheus
  'OL4288870W': ['Biography', 'Science'], // Einstein
  'OL1673205W': ['Thriller', 'Literary Fiction'], // The Godfather
  'OL28114312W': ['Romance', 'Thriller'], // Does It Hurt?
  'OL24341413W': ['Romance', 'Young Adult'], // Our Fault
  'OL20090688W': ['Romance'], // Red, White & Royal Blue
  'OL20032935W': ['Romance'], // The Hating Game
  'OL1865528W': ['Literary Fiction', 'Classics'], // The Bell Jar
  'OL259010W': ['Classics', 'Romance', 'Fantasy'], // A Midsummer Night's Dream
  'OL261794W': ['Dystopian', 'Science Fiction', 'Classics'], // A Clockwork Orange
  'OL17373843W': ['Science Fiction'], // Children of Time
  'OL52267W': ['Science Fiction', 'Classics'], // The Time Machine
  'OL46881W': ['Science Fiction', 'Thriller'], // Jurassic Park
  'OL21745884W': ['Science Fiction', 'Adventure'], // Project Hail Mary
  'OL455327W': ['Classics', 'Adventure'], // Lord of the Flies
  'OL265501W': ['Fantasy', 'Adventure', 'Young Adult'], // Into the Wild
  'OL98459W': ['Science Fiction', 'Classics'], // Slaughterhouse-Five
  'OL86318W': ['Classics', 'Literary Fiction'], // Ulysses
  'OL114967W': ['Classics', 'Historical Fiction'], // The Jungle
  'OL23166W': ['Classics', 'Literary Fiction'], // East of Eden
  'OL45089W': ['Classics', 'Adventure'], // Robinson Crusoe
  'OL471724W': ['Mystery', 'Classics'], // Death on the Nile
  'OL14873315W': ['Thriller', 'Mystery', 'Adventure'], // The Lost Symbol
  'OL18012166W': ['Fantasy', 'Historical Fiction'], // Circe
  'OL1089297W': ['Philosophy', 'Classics'], // The Prince
  'OL472715W': ['Mystery', 'Classics'], // The Mysterious Affair at Styles
  'OL471509W': ['Mystery', 'Classics'], // The A.B.C. Murders
  'OL81601W': ['Non-Fiction', 'Biography'], // On Writing
  'OL1812933W': ['Thriller', 'Horror'], // American Psycho
  'OL8193416W': ['Classics', 'Horror'], // The Picture of Dorian Gray
  'OL24156W': ['Classics', 'Horror'], // The Strange Case of Dr. Jekyll and Mr. Hyde
  'OL6027236W': ['Dystopian', 'Young Adult'], // The Maze Runner
  'OL9170454W': ['Classics', 'Literary Fiction'], // Hamlet
  'OL258902W': ['Classics', 'Literary Fiction'], // Macbeth
  'OL38663W': ['Classics', 'Literary Fiction'], // Heart of Darkness
  'OL151406W': ['Classics', 'Fantasy'], // Through the Looking-Glass
  'OL24034W': ['Adventure', 'Classics'], // Treasure Island
  'OL74504W': ['Adventure', 'Classics'], // White Fang
  'OL455305W': ['Classics', 'Historical Fiction'], // The Scarlet Letter
  'OL1898309W': ['Humour'], // The Cat in the Hat
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
  coverId: number
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

  const tryAdd = (doc: OlDoc, mapped: string[]): boolean => {
    const genres = GENRE_OVERRIDES[doc.key.replace('/works/', '')] ?? mapped
    // Ignore "; or, ..." and ": subtitle" parts so editions with longer titles count as duplicates.
    const titleKey = `${normalise(doc.title.split(/[;:]/)[0] ?? '')}|${normalise(doc.author_name?.[0] ?? '')}`
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
    const wanted = normalise(m.title)
    // The structured search can miss a title; a free-text query is the fallback.
    const queries = [
      `title=${encodeURIComponent(m.title)}&author=${encodeURIComponent(m.author)}&limit=20`,
      `q=${encodeURIComponent(`${m.title} ${m.author}`)}&limit=20`,
    ]
    let added = false
    for (const query of queries) {
      const res = await getJson<SearchResponse>(searchUrl(query))
      // Exact title matches first (avoids parodies and adaptations), then titles that contain it.
      const matches = res.docs.filter((d) => normalise(d.title).includes(wanted)).sort(byPopularity)
      const candidates = [...matches.filter((d) => normalise(d.title) === wanted), ...matches]
      added = candidates.some((d) => tryAdd(d, m.genres))
      if (added) break
    }
    if (!added) missing.push(m.title)
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
      coverId: doc.cover_i!,
      coverUrl: existsSync(path.join(COVERS_DIR, `${doc.cover_i}.jpg`))
        ? `/covers/${doc.cover_i}.jpg`
        : `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`,
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
