import { closeDb, db } from './client.js'
import { seedLibrary } from './seed-library.js'

// Standalone so it can run from built JS (dist/db/seed.js) in Docker.
try {
  const { books } = await seedLibrary(db)
  console.log(`Seeded library (${books} books)`)
} finally {
  await closeDb()
}
