import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import type { FieldError } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router'
import type { z } from 'zod'
import { bookInputSchema } from '@library/shared'
import type { BookDto, BookInput } from '@library/shared'
import { ApiError } from '../../api/client'
import { TextArea } from '../../components/TextField/TextArea'
import { TextField } from '../../components/TextField/TextField'
import { useAuthorSuggestions, useGenres, useSaveBook } from './api'
import { Cover } from './Cover'
import styles from './BookForm.module.css'
import { useDebouncedValue } from './useDebouncedValue'

type FormInput = z.input<typeof bookInputSchema>

const MAX_AUTHORS = 10
const AUTHORS_LIST_ID = 'book-form-author-suggestions'

const emptyValues: FormInput = {
  title: '',
  subtitle: '',
  description: '',
  isbn: '',
  coverUrl: '',
  publishedYear: null,
  pageCount: null,
  averageRating: null,
  authorNames: [''],
  genreSlugs: [],
}

function toFormValues(book: BookDto): FormInput {
  return {
    title: book.title,
    subtitle: book.subtitle ?? '',
    description: book.description ?? '',
    isbn: book.isbn ?? '',
    coverUrl: book.coverUrl ?? '',
    publishedYear: book.publishedYear,
    pageCount: book.pageCount,
    averageRating: book.averageRating,
    authorNames: book.authors.length > 0 ? book.authors.map((a) => a.name) : [''],
    genreSlugs: book.genres.map((g) => g.slug),
  }
}

/** Blank number inputs are null, never 0 or NaN. */
const toNumberOrNull = (v: unknown): number | null => {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(v)
  return Number.isNaN(n) ? null : n
}

/** The schema's own messages are for developers; map the common cases to plain language. */
function fieldMessage(error: FieldError | undefined, required: string, invalid: string): string | undefined {
  if (!error) return undefined
  if (error.type === 'custom' && error.message) return error.message
  return error.type === 'too_small' && required ? required : invalid
}

function previewCoverUrl(coverUrl: string, isbn: string): string | null {
  const url = coverUrl.trim()
  if (url) return url
  const digits = isbn.replace(/[-\s]/g, '')
  return /^(\d{9}[\dXx]|\d{13})$/.test(digits)
    ? `https://covers.openlibrary.org/b/isbn/${digits.toUpperCase()}-M.jpg`
    : null
}

export function BookForm({ book }: { book?: BookDto }) {
  const navigate = useNavigate()
  const location = useLocation()
  const save = useSaveBook(book?.id)
  const genres = useGenres()
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitted },
  } = useForm<FormInput, unknown, BookInput>({
    resolver: zodResolver(bookInputSchema),
    defaultValues: book ? toFormValues(book) : emptyValues,
  })

  const authorNames = useWatch({ control, name: 'authorNames' })
  const genreSlugs = useWatch({ control, name: 'genreSlugs' }) ?? []
  const title = useWatch({ control, name: 'title' })
  const coverUrl = useDebouncedValue(useWatch({ control, name: 'coverUrl' }) ?? '', 400)
  const isbn = useDebouncedValue(useWatch({ control, name: 'isbn' }) ?? '', 400)

  // Suggestions follow whichever author input was edited last.
  const [authorQuery, setAuthorQuery] = useState('')
  const suggestionQuery = useDebouncedValue(authorQuery.trim(), 250)
  const suggestions = useAuthorSuggestions(suggestionQuery)

  const setAuthors = (next: string[]) => setValue('authorNames', next, { shouldValidate: isSubmitted })

  const conflict = save.error instanceof ApiError && save.error.status === 409
  const bannerError = save.error && !conflict ? save.error : null

  const onSubmit = (values: BookInput) =>
    save.mutate(values, { onSuccess: (saved) => void navigate(`/books/${saved.id}`, { replace: true }) })

  const cancel = () => {
    if (location.key !== 'default') void navigate(-1)
    else void navigate(book ? `/books/${book.id}` : '/')
  }

  const authorsError =
    errors.authorNames?.root?.message ?? (errors.authorNames?.type === 'too_small' ? 'Add at least one author.' : undefined)

  const previewBook: BookDto = {
    id: 'preview',
    title: title || 'Untitled',
    subtitle: null,
    description: null,
    isbn: null,
    coverUrl: previewCoverUrl(coverUrl, isbn),
    publishedYear: null,
    pageCount: null,
    averageRating: null,
    authors: authorNames.filter((n) => n.trim()).map((name) => ({ id: name, name })),
    genres: [],
    createdAt: '',
    updatedAt: '',
  }

  return (
    <form className={styles.layout} onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate>
      <div className={styles.fields}>
        {bannerError && (
          <div className={styles.banner} role="alert">
            {bannerError.message}
          </div>
        )}

        <TextField
          label="Title"
          required
          error={fieldMessage(errors.title, 'Title is required.', 'Title is too long (300 characters max).')}
          {...register('title')}
        />
        <TextField
          label="Subtitle"
          error={fieldMessage(errors.subtitle, '', 'Subtitle is too long (300 characters max).')}
          {...register('subtitle')}
        />

        <fieldset className={styles.group}>
          <legend>Authors</legend>
          {authorNames.map((name, i) => {
            const error = fieldMessage(
              errors.authorNames?.[i] ?? undefined,
              'Author name is required.',
              'Author name is too long.',
            )
            const errorId = `author-${i}-error`
            return (
              <div key={i}>
                <div className={styles.authorRow}>
                  <input
                    className={styles.authorInput}
                    aria-label={`Author ${i + 1}`}
                    list={AUTHORS_LIST_ID}
                    autoComplete="off"
                    value={name}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? errorId : undefined}
                    onChange={(e) => {
                      setAuthorQuery(e.target.value)
                      setAuthors(authorNames.map((n, j) => (j === i ? e.target.value : n)))
                    }}
                  />
                  <button
                    type="button"
                    className={styles.secondary}
                    aria-label={`Remove author ${i + 1}`}
                    disabled={authorNames.length <= 1}
                    onClick={() => setAuthors(authorNames.filter((_, j) => j !== i))}
                  >
                    Remove
                  </button>
                </div>
                {error && (
                  <p id={errorId} className={styles.error}>
                    {error}
                  </p>
                )}
              </div>
            )
          })}
          <datalist id={AUTHORS_LIST_ID}>
            {suggestions.data?.map((a) => (
              <option key={a.id} value={a.name} />
            ))}
          </datalist>
          {authorsError && <p className={styles.error}>{authorsError}</p>}
          <button
            type="button"
            className={styles.secondary}
            disabled={authorNames.length >= MAX_AUTHORS}
            onClick={() => setAuthors([...authorNames, ''])}
          >
            Add author
          </button>
          <p className={styles.hint}>Up to {MAX_AUTHORS}. New names are created automatically.</p>
        </fieldset>

        <fieldset className={styles.group}>
          <legend>Genres</legend>
          {genres.isPending && <p className={styles.hint}>Loading genres…</p>}
          {genres.isError && <p className={styles.error}>Could not load genres.</p>}
          <div className={styles.chips}>
            {genres.data?.map((g) => (
              <label key={g.id} className={styles.chip}>
                <input
                  type="checkbox"
                  checked={genreSlugs.includes(g.slug)}
                  onChange={() =>
                    setValue(
                      'genreSlugs',
                      genreSlugs.includes(g.slug) ? genreSlugs.filter((s) => s !== g.slug) : [...genreSlugs, g.slug],
                    )
                  }
                />
                <span>{g.name}</span>
              </label>
            ))}
          </div>
          {errors.genreSlugs && <p className={styles.error}>Choose at most 10 genres.</p>}
        </fieldset>

        <TextArea
          label="Description"
          rows={6}
          error={fieldMessage(errors.description, '', 'Description is too long (5000 characters max).')}
          {...register('description')}
        />

        <div className={styles.row}>
          <TextField
            label="Published year"
            type="number"
            inputMode="numeric"
            error={fieldMessage(errors.publishedYear, '', 'Enter a whole year, e.g. 1965.')}
            {...register('publishedYear', { setValueAs: toNumberOrNull })}
          />
          <TextField
            label="Pages"
            type="number"
            inputMode="numeric"
            min={1}
            error={fieldMessage(errors.pageCount, '', 'Enter a whole number of pages.')}
            {...register('pageCount', { setValueAs: toNumberOrNull })}
          />
          <TextField
            label="Rating (0-5)"
            type="number"
            inputMode="decimal"
            step={0.1}
            min={0}
            max={5}
            error={fieldMessage(errors.averageRating, '', 'Enter a rating between 0 and 5.')}
            {...register('averageRating', { setValueAs: toNumberOrNull })}
          />
        </div>

        <TextField
          label="ISBN"
          hint="ISBN-10 or ISBN-13; hyphens are ignored."
          error={fieldMessage(errors.isbn, '', 'Enter a valid ISBN-10 or ISBN-13.') ?? (conflict ? 'A book with this ISBN already exists.' : undefined)}
          {...register('isbn')}
        />
        <TextField
          label="Cover URL"
          type="url"
          hint="Leave empty to use the Open Library cover for the ISBN."
          error={fieldMessage(errors.coverUrl, '', 'Enter a full URL, e.g. https://example.com/cover.jpg.')}
          {...register('coverUrl', { setValueAs: (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null) })}
        />

        <div className={styles.actions}>
          <button type="submit" className={`button ${styles.submit}`} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : book ? 'Save changes' : 'Create book'}
          </button>
          <button type="button" className={styles.secondary} onClick={cancel}>
            Cancel
          </button>
        </div>
      </div>

      <aside className={styles.preview} aria-label="Cover preview">
        <p className={styles.previewTitle}>Preview</p>
        <div className={styles.cover}>
          <Cover key={previewBook.coverUrl ?? ''} book={previewBook} />
        </div>
      </aside>
    </form>
  )
}
