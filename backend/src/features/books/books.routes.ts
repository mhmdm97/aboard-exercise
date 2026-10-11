import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { bookDtoSchema, bookInputSchema, bookListQuerySchema, bookListResponseSchema } from '@library/shared'
import type { Database } from '../../db/client.js'
import { errorResponseSchema } from '../../plugins/errors.js'
import { getBookById, listBooks } from './books.service.js'
import { deleteBook, saveBook, type WriteBookResult } from './books.write.js'

const notFound = { error: { code: 'NOT_FOUND', message: 'Book not found' } }
const adminSecurity = [{ cookieAuth: [] }]
const idParams = z.object({ id: z.uuid() })
const writeErrors = {
  400: errorResponseSchema,
  401: errorResponseSchema,
  403: errorResponseSchema,
  404: errorResponseSchema,
  409: errorResponseSchema,
}

/** Maps a failed write to its error response body + status. */
function writeFailure(result: Exclude<WriteBookResult, { ok: true }>) {
  switch (result.reason) {
    case 'not_found':
      return { status: 404, body: notFound } as const
    case 'unknown_genres':
      return {
        status: 400,
        body: {
          error: {
            code: 'VALIDATION_ERROR',
            message: `Unknown genre: ${result.slugs.join(', ')}`,
            details: { genreSlugs: result.slugs },
          },
        },
      } as const
    case 'duplicate_isbn':
      return {
        status: 409,
        body: { error: { code: 'CONFLICT', message: 'A book with this ISBN already exists' } },
      } as const
  }
}

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
    async (req) => listBooks(db, req.query),
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

  app.post(
    '/books',
    {
      preHandler: app.requireRole('admin'),
      schema: {
        tags: ['books'],
        summary: 'Create a book (admin)',
        security: adminSecurity,
        body: bookInputSchema,
        response: { 201: bookDtoSchema, ...writeErrors },
      },
    },
    async (req, reply) => {
      const result = await saveBook(db, req.body, { userId: req.user!.id })
      if (!result.ok) {
        const { status, body } = writeFailure(result)
        return reply.status(status).send(body)
      }
      return reply.status(201).send(result.book)
    },
  )

  app.put(
    '/books/:id',
    {
      preHandler: app.requireRole('admin'),
      schema: {
        tags: ['books'],
        summary: 'Replace a book (admin)',
        security: adminSecurity,
        params: idParams,
        body: bookInputSchema,
        response: { 200: bookDtoSchema, ...writeErrors },
      },
    },
    async (req, reply) => {
      const result = await saveBook(db, req.body, { id: req.params.id })
      if (!result.ok) {
        const { status, body } = writeFailure(result)
        return reply.status(status).send(body)
      }
      return result.book
    },
  )

  app.delete(
    '/books/:id',
    {
      preHandler: app.requireRole('admin'),
      schema: {
        tags: ['books'],
        summary: 'Delete a book (admin)',
        security: adminSecurity,
        params: idParams,
        response: { 204: z.null(), 400: errorResponseSchema, 401: errorResponseSchema, 403: errorResponseSchema, 404: errorResponseSchema },
      },
    },
    async (req, reply) => {
      if (!(await deleteBook(db, req.params.id))) return reply.status(404).send(notFound)
      return reply.status(204).send(null)
    },
  )
}
