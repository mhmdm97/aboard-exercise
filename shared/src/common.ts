import { z } from 'zod'

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  timestamp: z.string(),
})
export type HealthResponse = z.infer<typeof healthResponseSchema>

export function paginatedSchema<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
  })
}

export type Paginated<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
