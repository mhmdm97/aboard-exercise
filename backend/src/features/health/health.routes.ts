import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { healthResponseSchema } from '@library/shared'
import { errorResponseSchema } from '../../plugins/errors.js'
import type { Database } from '../../db/client.js'
import { checkHealth } from './health.service.js'

export const healthRoutes: FastifyPluginAsyncZod<{ db: Database }> = async (
  app,
  { db },
) => {
  app.get(
    '/health',
    {
      schema: {
        tags: ['health'],
        summary: 'Liveness and database connectivity check',
        response: { 200: healthResponseSchema, 503: errorResponseSchema },
      },
    },
    async (_req, reply) => {
      const health = await checkHealth(db)
      if (!health) {
        return reply.status(503).send({
          error: { code: 'SERVICE_UNAVAILABLE', message: 'Database is unreachable' },
        })
      }
      return health
    },
  )
}
