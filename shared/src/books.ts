import { z } from 'zod'
import { paginatedSchema } from './common.js'

export const authorDtoSchema = z.object({ id: z.uuid(), name: z.string() })
export type AuthorDto = z.infer<typeof authorDtoSchema>

export const genreDtoSchema = z.object({ id: z.uuid(), name: z.string(), slug: z.string() })
export type GenreDto = z.infer<typeof genreDtoSchema>

export const bookDtoSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  subtitle: z.string().nullable(),
  description: z.string().nullable(),
  isbn: z.string().nullable(),
  coverUrl: z.string().nullable(),
  publishedYear: z.number().int().nullable(),
  pageCount: z.number().int().nullable(),
  averageRating: z.number().nullable(),
  authors: z.array(authorDtoSchema),
  genres: z.array(genreDtoSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type BookDto = z.infer<typeof bookDtoSchema>

export const bookListResponseSchema = paginatedSchema(bookDtoSchema)
export type BookListResponse = z.infer<typeof bookListResponseSchema>

/** Optional text field: blank/whitespace-only and null become null. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null))

/** ISBN-10 or ISBN-13: hyphens/spaces are stripped, digits (and a trailing X for ISBN-10) only. */
const isbnSchema = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v ? v.replace(/[-\s]/g, '').toUpperCase() : null))
  .refine((v) => v === null || /^(\d{9}[\dX]|\d{13})$/.test(v), {
    message: 'Must be a valid ISBN-10 or ISBN-13',
  })

const optionalInt = (min: number, max: number) =>
  z.number().int().min(min).max(max).nullish().transform((v) => v ?? null)

export const bookInputSchema = z.object({
  title: z.string().trim().min(1).max(300),
  subtitle: optionalText(300),
  description: optionalText(5000),
  isbn: isbnSchema,
  coverUrl: z.url().nullish().transform((v) => v ?? null),
  publishedYear: optionalInt(0, new Date().getFullYear() + 1),
  pageCount: optionalInt(1, 20000),
  averageRating: z.number().min(0).max(5).nullish().transform((v) => v ?? null),
  authorNames: z.array(z.string().trim().min(1).max(200)).min(1).max(10),
  genreSlugs: z.array(z.string().trim().min(1)).max(10).default([]),
})
export type BookInput = z.infer<typeof bookInputSchema>

/** Query strings: a value may repeat (?genre=a&genre=b) or be comma separated (?genre=a,b). */
const stringList = z
  .union([z.string(), z.array(z.string())])
  .transform((v) =>
    (Array.isArray(v) ? v : [v]).flatMap((s) => s.split(',')).map((s) => s.trim()).filter(Boolean),
  )

export const bookSortSchema = z.enum(['title', 'year', 'rating', 'newest'])
export type BookSort = z.infer<typeof bookSortSchema>

export const bookListQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
  genre: stringList.optional(),
  author: z.uuid().optional(),
  yearFrom: z.coerce.number().int().optional(),
  yearTo: z.coerce.number().int().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  sort: bookSortSchema.default('title'),
  order: z.enum(['asc', 'desc']).default('asc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(24),
})
export type BookListQuery = z.infer<typeof bookListQuerySchema>
