import cookie from '@fastify/cookie'
import type { FastifyReply, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'
import type { UserDto, UserRole } from '@library/shared'
import type { Env } from '../config/env.js'
import type { Database } from '../db/client.js'
import { SESSION_COOKIE, resolveSession } from '../features/auth/sessions.js'

type Guard = (req: FastifyRequest, reply: FastifyReply) => Promise<void>

declare module 'fastify' {
  interface FastifyRequest {
    /** The logged-in user, or null for anonymous requests. */
    user: UserDto | null
  }
  interface FastifyInstance {
    /** `preHandler` guard: 401 unless logged in. */
    requireAuth: Guard
    /** `preHandler` guard factory: 401 unless logged in, 403 FORBIDDEN unless the user has `role`. */
    requireRole: (role: UserRole) => Guard
  }
}

export interface AuthPluginOptions {
  db: Database
  env: Pick<Env, 'NODE_ENV' | 'SESSION_TTL_DAYS'>
}

export const authPlugin = fp<AuthPluginOptions>(
  async (app, { db }) => {
    // The session token is 32 random bytes (opaque, unguessable), so cookie signing adds nothing.
    await app.register(cookie)

    app.decorateRequest('user', null)
    app.addHook('onRequest', async (req) => {
      const token = req.cookies[SESSION_COOKIE]
      req.user = token ? await resolveSession(db, token) : null
    })

    const requireAuth: Guard = async (req) => {
      if (!req.user) throw app.httpErrors.unauthorized('Authentication required')
    }
    app.decorate('requireAuth', requireAuth)
    app.decorate('requireRole', (role: UserRole): Guard => async (req, reply) => {
      await requireAuth(req, reply)
      if (req.user?.role !== role) throw app.httpErrors.forbidden('Insufficient permissions')
    })
  },
  { name: 'auth' },
)
