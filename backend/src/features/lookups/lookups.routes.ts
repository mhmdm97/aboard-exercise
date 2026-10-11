import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { authorDtoSchema, genreDtoSchema } from '@library/shared'
import type { Database } from '../../db/client.js'
import { errorResponseSchema } from '../../plugins/errors.js'
import { listGenres, searchAuthors } from './lookups.service.js'

export const lookupRoutes: FastifyPluginAsyncZod<{ db: Database }> = async (app, { db }) => {
  app.get(
    '/genres',
    {
      schema: {
        tags: ['lookups'],
        summary: 'List all genres',
        response: { 200: z.array(genreDtoSchema) },
      },
    },
    async () => listGenres(db),
  )

  app.get(
    '/authors',
    {
      schema: {
        tags: ['lookups'],
        summary: 'Find authors by name (autocomplete)',
        querystring: z.object({
          q: z.string().trim().min(1).optional(),
          limit: z.coerce.number().int().min(1).max(50).default(20),
        }),
        response: { 200: z.array(authorDtoSchema), 400: errorResponseSchema },
      },
    },
    async (req) => searchAuthors(db, req.query.q, req.query.limit),
  )
}
