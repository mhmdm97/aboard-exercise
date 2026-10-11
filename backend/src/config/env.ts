import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(1).optional(),
  COOKIE_SECRET: z.string().min(1).optional(),
  SESSION_TTL_DAYS: z.coerce.number().positive().default(7),
  CORS_ORIGIN: z.string().min(1).optional(),
  // Defaults to true in production; set false to allow login over plain http (local Docker).
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
})

export type Env = z.infer<typeof envSchema>

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source)
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n')
    throw new Error(`Invalid environment configuration:\n${issues}`)
  }
  return result.data
}
