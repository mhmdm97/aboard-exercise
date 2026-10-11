import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { bookDtoSchema } from '@library/shared'
import type { Database } from '../../db/client.js'
import { errorResponseSchema } from '../../plugins/errors.js'
import { addFavourite, listFavouriteBooks, listFavouriteIds, removeFavourite } from './favourites.service.js'

const security = [{ cookieAuth: [] }]
const params = z.object({ id: z.uuid() })

export const favouriteRoutes: FastifyPluginAsyncZod<{ db: Database }> = async (app, { db }) => {
  app.addHook('preHandler', app.requireAuth)

  app.put(
    '/books/:id/favourite',
    {
      schema: {
        tags: ['favourites'],
        summary: 'Add a book to my favourites (idempotent)',
        security,
        params,
        response: { 204: z.null(), 400: errorResponseSchema, 401: errorResponseSchema, 404: errorResponseSchema },
      },
    },
    async (req, reply) => {
      if (!(await addFavourite(db, req.user!.id, req.params.id))) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Book not found' } })
      }
      return reply.status(204).send(null)
    },
  )

  app.delete(
    '/books/:id/favourite',
    {
      schema: {
        tags: ['favourites'],
        summary: 'Remove a book from my favourites (idempotent)',
        security,
        params,
        response: { 204: z.null(), 400: errorResponseSchema, 401: errorResponseSchema },
      },
    },
    async (req, reply) => {
      await removeFavourite(db, req.user!.id, req.params.id)
      return reply.status(204).send(null)
    },
  )

  app.get(
    '/me/favourites',
    {
      schema: {
        tags: ['favourites'],
        summary: 'My favourite books, most recently favourited first',
        security,
        response: { 200: z.array(bookDtoSchema), 401: errorResponseSchema },
      },
    },
    async (req) => listFavouriteBooks(db, req.user!.id),
  )

  app.get(
    '/me/favourites/ids',
    {
      schema: {
        tags: ['favourites'],
        summary: 'Ids of my favourite books',
        security,
        response: { 200: z.array(z.uuid()), 401: errorResponseSchema },
      },
    },
    async (req) => listFavouriteIds(db, req.user!.id),
  )
}
