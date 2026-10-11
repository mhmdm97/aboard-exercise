import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { healthResponseSchema } from '@library/shared'
import { buildApp } from '../../app.js'
import { loadEnv } from '../../config/env.js'
import { closeDb, db, type Database } from '../../db/client.js'

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

  it('returns 503 in the JSON error shape when the database query fails', async () => {
    const failingDb = {
      execute: () => Promise.reject(new Error('connection refused')),
    } as unknown as Database
    const broken = await buildApp({ env: loadEnv(), db: failingDb })
    try {
      const res = await broken.inject({ method: 'GET', url: '/api/health' })
      expect(res.statusCode).toBe(503)
      expect(res.json()).toMatchObject({ error: { code: 'SERVICE_UNAVAILABLE' } })
    } finally {
      await broken.close()
    }
  })

  it('returns the generic 400 validation shape for bad query params', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/books?page=0' })
    expect(res.statusCode).toBe(400)
    const body = res.json<{ error: { code: string; message: string; details: unknown[] } }>()
    expect(body.error.code).toBe('VALIDATION_ERROR')
    expect(typeof body.error.message).toBe('string')
    expect(Array.isArray(body.error.details)).toBe(true)
  })

  it('returns 404 in the JSON error shape for unknown routes', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/nope' })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toMatchObject({ error: { code: 'NOT_FOUND' } })
  })
})
