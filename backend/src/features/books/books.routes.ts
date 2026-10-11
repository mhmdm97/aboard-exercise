import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { bookDtoSchema, bookListQuerySchema, bookListResponseSchema } from '@library/shared'
import type { Database } from '../../db/client.js'
import { errorResponseSchema } from '../../plugins/errors.js'
import { getBookById, listBooks } from './books.service.js'

export const bookRoutes: FastifyPluginAsyncZod<{ db: Database }> = async (app, { db }) => {
  app.get(
    '/books',
    {
      schema: {
        tags: ['books'],
        summary: 'List books with search, filters, sorting and pagination',
        querystring: bookListQuerySchema,
        response: { 200: bookListResponseSchema, 400: errorResponseSchema },
      },
    },
    async (req) => {
      // `sort` has a schema default, so check the raw URL: searching without an explicit sort ranks by relevance.
      const explicitSort = new URL(req.url, 'http://localhost').searchParams.has('sort')
      return listBooks(db, req.query, { relevance: !explicitSort })
    },
  )

  app.get(
    '/books/:id',
    {
      schema: {
        tags: ['books'],
        summary: 'Get a book by id',
        params: z.object({ id: z.uuid() }),
        response: { 200: bookDtoSchema, 400: errorResponseSchema, 404: errorResponseSchema },
      },
    },
    async (req, reply) => {
      const book = await getBookById(db, req.params.id)
      if (!book) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Book not found' } })
      }
      return book
    },
  )
}
