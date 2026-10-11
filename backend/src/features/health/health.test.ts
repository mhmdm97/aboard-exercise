import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { healthResponseSchema } from '@library/shared'
import { buildApp } from '../../app.js'
import { loadEnv } from '../../config/env.js'
import { closeDb, db } from '../../db/client.js'

let app: FastifyInstance

beforeAll(async () => {
  app = await buildApp({ env: loadEnv(), db })
})

afterAll(async () => {
  await app.close()
  await closeDb()
})

describe('GET /api/health', () => {
  it('returns ok with a timestamp', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' })
    expect(res.statusCode).toBe(200)
    expect(healthResponseSchema.parse(res.json()).status).toBe('ok')
  })

  it('returns 404 in the JSON error shape for unknown routes', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/nope' })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toMatchObject({ error: { code: 'NOT_FOUND' } })
  })
})
