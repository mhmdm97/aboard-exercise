import type { FastifyError, FastifyInstance } from 'fastify'
import { hasZodFastifySchemaValidationErrors, isResponseSerializationError } from 'fastify-type-provider-zod'
import { z } from 'zod'

export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
})

function codeFor(status: number): string {
  switch (status) {
    case 400: return 'BAD_REQUEST'
    case 401: return 'UNAUTHORIZED'
    case 403: return 'FORBIDDEN'
    case 404: return 'NOT_FOUND'
    case 409: return 'CONFLICT'
    case 429: return 'TOO_MANY_REQUESTS'
    default: return status >= 500 ? 'INTERNAL_ERROR' : 'ERROR'
  }
}

/** Central error + 404 handling so every error uses `{ error: { code, message, details? } }`. */
export function registerErrorHandling(app: FastifyInstance): void {
  app.setNotFoundHandler((req, reply) => {
    reply.status(404).send({
      error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.url} not found` },
    })
  })

  app.setErrorHandler((err: FastifyError, req, reply) => {
    if (hasZodFastifySchemaValidationErrors(err)) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Request validation failed', details: err.validation },
      })
    }
    if (isResponseSerializationError(err)) {
      req.log.error({ err }, 'response serialization failed')
      return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } })
    }
    const status = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500
    if (status >= 500) req.log.error({ err }, 'unhandled error')
    return reply.status(status).send({
      error: {
        code: codeFor(status),
        message: status >= 500 ? 'Internal server error' : err.message,
      },
    })
  })
}
