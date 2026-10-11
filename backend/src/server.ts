import { buildApp } from './app.js'
import { loadEnv } from './config/env.js'
import { closeDb, db } from './db/client.js'

const env = loadEnv()
const app = await buildApp({ env, db })

async function shutdown(signal: string): Promise<void> {
  app.log.info({ signal }, 'shutting down')
  await app.close()
  await closeDb()
  process.exit(0)
}
process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))

try {
  await app.listen({ port: env.PORT, host: env.HOST })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
