import { closeDb, db } from './client.js'
import { seedUsers } from './seed-users.js'
import { seedLibrary } from './seed-library.js'

// Standalone so it can run from built JS (dist/db/seed.js) in Docker.
try {
  const { books } = await seedLibrary(db)
  const { users } = await seedUsers(db)
  console.log(`Seeded library (${books} books, ${users} demo users)`)
} finally {
  await closeDb()
}
