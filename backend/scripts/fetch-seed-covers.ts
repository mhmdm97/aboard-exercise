/**
 * Downloads the seed book covers into frontend/public/covers/<id>.jpg and rewrites
 * backend/src/db/seed/books.json so each book has `coverId` and a local `coverUrl`.
 *
 *   npm run seed:covers -w @library/backend
 *
 * Needs internet. Resumable: valid files already on disk are skipped. Books whose cover
 * could not be downloaded keep their remote Open Library URL; just re-run.
 */
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const BOOKS_JSON = path.resolve(HERE, '..', 'src', 'db', 'seed', 'books.json')
const COVERS_DIR = path.resolve(HERE, '..', '..', 'frontend', 'public', 'covers')
const USER_AGENT = 'abroad-exercise-seed/1.0 (+https://github.com/mhmdm97/abroad-exercise)'
const CONCURRENCY = 4
const ATTEMPTS = 4
const TIMEOUT_MS = 30_000

interface SeedBook {
  title: string
  coverId?: number
  coverUrl: string
  [key: string]: unknown
}

const REMOTE_RE = /covers\.openlibrary\.org\/b\/id\/(\d+)-[SML]\.jpg/
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Checks JPEG magic bytes and that a SOF0/SOF2 marker reports a width above 1 (Open Library's "no cover" is 1x1). */
export function isValidJpeg(buf: Buffer): boolean {
  if (buf.length < 200 || buf[0] !== 0xff || buf[1] !== 0xd8 || buf[2] !== 0xff) return false
  let i = 2
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) {
      i++
      continue
    }
    const marker = buf[i + 1]!
    if (marker === 0xff) {
      i++
      continue
    }
    if (marker === 0xc0 || marker === 0xc2) {
      return buf.readUInt16BE(i + 7) > 1 && buf.readUInt16BE(i + 5) > 1
    }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2
      continue
    }
    i += 2 + buf.readUInt16BE(i + 2)
  }
  return false
}

async function fileValid(file: string): Promise<boolean> {
  try {
    await stat(file)
    return isValidJpeg(await readFile(file))
  } catch {
    return false
  }
}

async function download(id: number, file: string): Promise<void> {
  let lastError: unknown
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const res = await fetch(`https://covers.openlibrary.org/b/id/${id}-M.jpg?default=false`, {
        redirect: 'follow',
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const buf = Buffer.from(await res.arrayBuffer())
      if (!isValidJpeg(buf)) throw new Error('not a valid JPEG')
      const tmp = `${file}.tmp`
      await writeFile(tmp, buf)
      await rename(tmp, file)
      return
    } catch (err) {
      lastError = err
      if (attempt < ATTEMPTS) await sleep(1000 * 2 ** attempt)
    }
  }
  throw lastError
}

async function main(): Promise<void> {
  await mkdir(COVERS_DIR, { recursive: true })
  const books: SeedBook[] = JSON.parse(await readFile(BOOKS_JSON, 'utf8'))
  const failed: string[] = []
  let next = 0
  let done = 0

  const worker = async () => {
    while (next < books.length) {
      const book = books[next++]!
      const id = book.coverId ?? Number(REMOTE_RE.exec(book.coverUrl)?.[1])
      if (!Number.isInteger(id) || id <= 0) {
        failed.push(`${book.title} (no cover id)`)
        continue
      }
      book.coverId = id
      const file = path.join(COVERS_DIR, `${id}.jpg`)
      try {
        if (!(await fileValid(file))) await download(id, file)
        book.coverUrl = `/covers/${id}.jpg`
      } catch (err) {
        failed.push(`${book.title} (${id}): ${err instanceof Error ? err.message : String(err)}`)
      }
      if (++done % 25 === 0) console.log(`${done}/${books.length}`)
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))

  // Keep field order stable: coverId goes right before coverUrl.
  const out = books.map((b) => {
    const { coverId, coverUrl, ...rest } = b
    return { ...rest, coverId, coverUrl }
  })
  await writeFile(BOOKS_JSON, `${JSON.stringify(out, null, 2)}\n`)

  let bytes = 0
  for (const b of books) {
    if (b.coverUrl.startsWith('/covers/')) bytes += (await stat(path.join(COVERS_DIR, `${b.coverId}.jpg`))).size
  }
  console.log(`ok: ${books.length - failed.length}, failed: ${failed.length}, total: ${(bytes / 1024 / 1024).toFixed(2)} MB`)
  for (const f of failed) console.log(`FAILED ${f}`)
}

await main()
