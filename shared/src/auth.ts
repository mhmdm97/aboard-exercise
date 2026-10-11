import { z } from 'zod'
import { userDtoSchema } from './users.js'

const emailSchema = z.string().trim().toLowerCase().pipe(z.email())

export const registerInputSchema = z.object({
  email: emailSchema,
  name: z.string().trim().min(1).max(100),
  password: z.string().min(8).max(128),
})
export type RegisterInput = z.infer<typeof registerInputSchema>

export const loginInputSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
})
export type LoginInput = z.infer<typeof loginInputSchema>

/** `GET /auth/me`: `user` is null for anonymous visitors (a 200, so browsers log no failed request). */
export const meResponseSchema = z.object({ user: userDtoSchema.nullable() })
export type MeResponse = z.infer<typeof meResponseSchema>
