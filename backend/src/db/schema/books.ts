import { relations, sql } from 'drizzle-orm'
import {
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { users } from './users.js'

export const authors = pgTable(
  'authors',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('authors_name_trgm_idx').using('gin', sql`${t.name} gin_trgm_ops`)],
)

export const genres = pgTable('genres', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
})

export const books = pgTable(
  'books',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    subtitle: text('subtitle'),
    description: text('description'),
    isbn: text('isbn').unique(),
    coverUrl: text('cover_url'),
    publishedYear: integer('published_year'),
    pageCount: integer('page_count'),
    // 0.00 - 5.00, returned as a string by the driver: map to number in TS.
    averageRating: numeric('average_rating', { precision: 3, scale: 2, mode: 'number' }),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('books_title_trgm_idx').using('gin', sql`${t.title} gin_trgm_ops`),
    index('books_published_year_idx').on(t.publishedYear),
    index('books_average_rating_idx').on(t.averageRating),
  ],
)

export const bookAuthors = pgTable(
  'book_authors',
  {
    bookId: uuid('book_id')
      .notNull()
      .references(() => books.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => authors.id, { onDelete: 'cascade' }),
    position: integer('position').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.bookId, t.authorId] }), index('book_authors_author_idx').on(t.authorId)],
)

export const bookGenres = pgTable(
  'book_genres',
  {
    bookId: uuid('book_id')
      .notNull()
      .references(() => books.id, { onDelete: 'cascade' }),
    genreId: uuid('genre_id')
      .notNull()
      .references(() => genres.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.bookId, t.genreId] }), index('book_genres_genre_idx').on(t.genreId)],
)

export const favourites = pgTable(
  'favourites',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    bookId: uuid('book_id')
      .notNull()
      .references(() => books.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.bookId] }), index('favourites_book_idx').on(t.bookId)],
)

export const booksRelations = relations(books, ({ one, many }) => ({
  creator: one(users, { fields: [books.createdBy], references: [users.id] }),
  bookAuthors: many(bookAuthors),
  bookGenres: many(bookGenres),
  favourites: many(favourites),
}))

export const authorsRelations = relations(authors, ({ many }) => ({ bookAuthors: many(bookAuthors) }))
export const genresRelations = relations(genres, ({ many }) => ({ bookGenres: many(bookGenres) }))

export const bookAuthorsRelations = relations(bookAuthors, ({ one }) => ({
  book: one(books, { fields: [bookAuthors.bookId], references: [books.id] }),
  author: one(authors, { fields: [bookAuthors.authorId], references: [authors.id] }),
}))

export const bookGenresRelations = relations(bookGenres, ({ one }) => ({
  book: one(books, { fields: [bookGenres.bookId], references: [books.id] }),
  genre: one(genres, { fields: [bookGenres.genreId], references: [genres.id] }),
}))

export const favouritesRelations = relations(favourites, ({ one }) => ({
  user: one(users, { fields: [favourites.userId], references: [users.id] }),
  book: one(books, { fields: [favourites.bookId], references: [books.id] }),
}))

export const usersRelations = relations(users, ({ many }) => ({ favourites: many(favourites) }))
