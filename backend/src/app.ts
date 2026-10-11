import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import sensible from '@fastify/sensible'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import Fastify, { type FastifyInstance } from 'fastify'
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod'
import type { Env } from './config/env.js'
import type { Database } from './db/client.js'
import { healthRoutes } from './features/health/health.routes.js'
import { registerErrorHandling } from './plugins/errors.js'

export interface AppOptions {
  env: Pick<Env, 'NODE_ENV' | 'CORS_ORIGIN'>
  db: Database
}

export async function buildApp({ env, db }: AppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger:
      env.NODE_ENV === 'test'
        ? false
        : env.NODE_ENV === 'development'
          ? { transport: { target: 'pino-pretty' } }
          : true,
  })

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)
  registerErrorHandling(app)

  await app.register(helmet, {
    // Swagger UI needs inline scripts/styles
    contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
  })
  if (env.CORS_ORIGIN) await app.register(cors, { origin: env.CORS_ORIGIN, credentials: true })
  await app.register(sensible)
  await app.register(swagger, {
    openapi: { info: { title: 'Library API', version: '0.0.0' } },
    transform: jsonSchemaTransform,
  })
  await app.register(swaggerUi, { routePrefix: '/api/docs' })

  await app.register(
    async (api) => {
      await api.register(healthRoutes, { db })
    },
    { prefix: '/api' },
  )

  return app
}
