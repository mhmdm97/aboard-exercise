import { hash, verify } from '@node-rs/argon2'
import type { FastifyReply } from 'fastify'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import {
  loginInputSchema,
  registerInputSchema,
  meResponseSchema,
  userDtoSchema,
  type UserDto,
} from '@library/shared'
import type { Env } from '../../config/env.js'
import type { Database } from '../../db/client.js'
import { users } from '../../db/schema/index.js'
import { errorResponseSchema } from '../../plugins/errors.js'
import { SESSION_COOKIE, createSession, deleteSession } from './sessions.js'

interface AuthRouteOptions {
  db: Database
  env: Pick<Env, 'NODE_ENV' | 'SESSION_TTL_DAYS' | 'COOKIE_SECURE'>
}

// Verified against when the email is unknown, so response time doesn't reveal which emails exist.
const dummyHash = await hash('dummy-password-for-timing')

const rateLimit = { max: 10, timeWindow: '1 minute' }

export const authRoutes: FastifyPluginAsyncZod<AuthRouteOptions> = async (app, { db, env }) => {
  const startSession = async (reply: FastifyReply, userId: string): Promise<void> => {
    const token = await createSession(db, userId, env.SESSION_TTL_DAYS)
    reply.setCookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: env.COOKIE_SECURE ?? env.NODE_ENV === 'production',
      maxAge: Math.round(env.SESSION_TTL_DAYS * 24 * 60 * 60),
    })
  }

  const toDto = (u: UserDto): UserDto => ({ id: u.id, email: u.email, name: u.name, role: u.role })

  app.post(
    '/register',
    {
      config: { rateLimit },
      schema: {
        tags: ['auth'],
        summary: 'Create a member account and log in',
        body: registerInputSchema,
        response: { 201: userDtoSchema, 400: errorResponseSchema, 409: errorResponseSchema },
      },
    },
    async (req, reply) => {
      const { email, name, password } = req.body
      const [user] = await db
        .insert(users)
        .values({ email, name, passwordHash: await hash(password), role: 'member' })
        .onConflictDoNothing({ target: users.email })
        .returning()
      if (!user) {
        return reply
          .status(409)
          .send({ error: { code: 'CONFLICT', message: 'An account with this email already exists' } })
      }
      await startSession(reply, user.id)
      return reply.status(201).send(toDto(user))
    },
  )

  app.post(
    '/login',
    {
      config: { rateLimit },
      schema: {
        tags: ['auth'],
        summary: 'Log in with email and password',
        body: loginInputSchema,
        response: { 200: userDtoSchema, 400: errorResponseSchema, 401: errorResponseSchema },
      },
    },
    async (req, reply) => {
      const { email, password } = req.body
      const [user] = await db.select().from(users).where(eq(users.email, email))
      const valid = await verify(user?.passwordHash ?? dummyHash, password)
      if (!user || !valid) {
        return reply
          .status(401)
          .send({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } })
      }
      await startSession(reply, user.id)
      return toDto(user)
    },
  )

  app.post(
    '/logout',
    {
      schema: {
        tags: ['auth'],
        summary: 'Log out (idempotent)',
        response: { 204: z.null() },
      },
    },
    async (req, reply) => {
      const token = req.cookies[SESSION_COOKIE]
      if (token) await deleteSession(db, token)
      reply.clearCookie(SESSION_COOKIE, { path: '/' })
      return reply.status(204).send(null)
    },
  )

  app.get(
    '/me',
    {
      schema: {
        tags: ['auth'],
        summary: 'The current user, or null when anonymous',
        security: [{ cookieAuth: [] }, {}],
        response: { 200: meResponseSchema },
      },
    },
    async (req) => ({ user: req.user }),
  )
}
