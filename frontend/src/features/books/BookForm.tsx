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
import { canViewTransition } from '../../hooks/viewTransition'

type FormInput = z.input<typeof bookInputSchema>

const MAX_AUTHORS = 10
const AUTHORS_LIST_ID = 'book-form-author-suggestions'
const DESCRIPTION_MAX = 5000

/** Field ids, so the error summary can move focus to a field. */
const FIELD_IDS = {
  title: 'bf-title',
  subtitle: 'bf-subtitle',
  authorNames: 'bf-author-0',
  genreSlugs: 'bf-genres',
  description: 'bf-description',
  publishedYear: 'bf-year',
  pageCount: 'bf-pages',
  averageRating: 'bf-rating',
  isbn: 'bf-isbn',
  coverUrl: 'bf-cover',
} as const
const FIELD_LABELS: Record<keyof typeof FIELD_IDS, string> = {
  title: 'Title',
  subtitle: 'Subtitle',
  authorNames: 'Authors',
  genreSlugs: 'Genres',
  description: 'Description',
  publishedYear: 'Year',
  pageCount: 'Pages',
  averageRating: 'Rating',
  isbn: 'ISBN',
  coverUrl: 'Cover URL',
}

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

function AlertIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className={styles.bannerIcon}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5M12 16.5v.01" />
    </svg>
  )
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
  const description = useWatch({ control, name: 'description' }) ?? ''
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
    save.mutate(values, {
      onSuccess: (saved) =>
        void navigate(`/books/${saved.id}`, { replace: true, viewTransition: canViewTransition() }),
    })

  const cancel = () => {
    if (location.key !== 'default') void navigate(-1)
    else void navigate(book ? `/books/${book.id}` : '/')
  }

  const authorsError =
    errors.authorNames?.root?.message ?? (errors.authorNames?.type === 'too_small' ? 'Add at least one author.' : undefined)

  // Fields that failed client-side validation, for the summary banner (a 409 shows inline on the ISBN field only).
  const invalidFields = (Object.keys(FIELD_IDS) as (keyof typeof FIELD_IDS)[]).filter((name) => errors[name])
  const focusField = (name: keyof typeof FIELD_IDS) => {
    const id =
      name === 'authorNames'
        ? `bf-author-${Math.max(0, authorNames.findIndex((_, i) => errors.authorNames?.[i]))}`
        : FIELD_IDS[name]
    document.getElementById(id)?.focus()
  }

  const selectedGenres = (genres.data ?? []).filter((g) => genreSlugs.includes(g.slug)).map((g) => g.name)
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
  const previewAuthors = previewBook.authors.map((a) => a.name).join(', ')

  return (
    <form className={styles.layout} onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate aria-busy={save.isPending}>
      <div className={styles.main}>
        {(bannerError || (isSubmitted && invalidFields.length > 0)) && (
          <div className={styles.banner} role="alert">
            <AlertIcon />
            <div className={styles.bannerBody}>
              {bannerError ? (
                <strong>{bannerError.message}</strong>
              ) : (
                <>
                  <strong>
                    The book wasn't saved. {invalidFields.length} {invalidFields.length === 1 ? 'field needs' : 'fields need'}{' '}
                    attention.
                  </strong>
                  <span className={styles.bannerLinks}>
                    {invalidFields.map((name) => (
                      <button key={name} type="button" className="btn-link" onClick={() => focusField(name)}>
                        {FIELD_LABELS[name]}
                      </button>
                    ))}
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        <fieldset className={styles.section} disabled={save.isPending}>
          <legend className={styles.sectionTitle}>The book</legend>
          <TextField
            id={FIELD_IDS.title}
            label="Title"
            required
            error={fieldMessage(errors.title, 'Title is required.', 'Title is too long (300 characters max).')}
            {...register('title')}
          />
          <TextField
            id={FIELD_IDS.subtitle}
            label="Subtitle"
            placeholder="Optional"
            error={fieldMessage(errors.subtitle, '', 'Subtitle is too long (300 characters max).')}
            {...register('subtitle')}
          />

          <fieldset className={styles.group}>
            <legend className={styles.label}>Authors</legend>
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
                      id={`bf-author-${i}`}
                      className="input"
                      aria-label={`Author ${i + 1}`}
                      list={AUTHORS_LIST_ID}
                      autoComplete="off"
                      placeholder="Start typing a name"
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
                      className="btn btn-ghost btn-icon"
                      aria-label={`Remove author ${i + 1}`}
                      disabled={authorNames.length <= 1}
                      onClick={() => setAuthors(authorNames.filter((_, j) => j !== i))}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
                        <path d="M6 6l12 12M18 6 6 18" />
                      </svg>
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
            <div>
              <button
                type="button"
                className={`btn btn-ghost ${styles.addAuthor}`}
                disabled={authorNames.length >= MAX_AUTHORS}
                onClick={() => setAuthors([...authorNames, ''])}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Add author
              </button>
            </div>
            <p className={styles.hint}>Up to {MAX_AUTHORS}. New names are created automatically.</p>
          </fieldset>
        </fieldset>

        <fieldset className={styles.section} id={FIELD_IDS.genreSlugs} tabIndex={-1} disabled={save.isPending}>
          <legend className={styles.sectionTitle}>Genres</legend>
          <p className={styles.hint}>Choose up to 10.</p>
          {genres.isPending && <p className={styles.hint}>Loading genres…</p>}
          {genres.isError && <p className={styles.error}>Could not load genres.</p>}
          <div className={styles.chips}>
            {genres.data?.map((g) => {
              const on = genreSlugs.includes(g.slug)
              return (
                <label key={g.id} className={on ? `chip on ${styles.chip}` : `chip ${styles.chip}`}>
                  <input
                    type="checkbox"
                    className="visually-hidden"
                    checked={on}
                    onChange={() =>
                      setValue('genreSlugs', on ? genreSlugs.filter((s) => s !== g.slug) : [...genreSlugs, g.slug])
                    }
                  />
                  <svg className="tick" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden="true">
                    <path d="m5 12 5 5 9-10" />
                  </svg>
                  {g.name}
                </label>
              )
            })}
          </div>
          {errors.genreSlugs && <p className={styles.error}>Choose at most 10 genres.</p>}
        </fieldset>

        <fieldset className={styles.section} disabled={save.isPending}>
          <legend className={styles.sectionTitle}>Details</legend>
          <div className={styles.grid3}>
            <TextField
              id={FIELD_IDS.isbn}
              label="ISBN"
              hint="ISBN-10 or ISBN-13; hyphens are ignored."
              error={
                fieldMessage(errors.isbn, '', 'Enter a valid ISBN-10 or ISBN-13.') ??
                (conflict ? 'A book with this ISBN already exists.' : undefined)
              }
              {...register('isbn')}
            />
            <TextField
              id={FIELD_IDS.publishedYear}
              label="Published year"
              type="number"
              inputMode="numeric"
              error={fieldMessage(errors.publishedYear, '', 'Enter a whole year, e.g. 1965.')}
              {...register('publishedYear', { setValueAs: toNumberOrNull })}
            />
            <TextField
              id={FIELD_IDS.pageCount}
              label="Pages"
              type="number"
              inputMode="numeric"
              min={1}
              error={fieldMessage(errors.pageCount, '', 'Enter a whole number of pages.')}
              {...register('pageCount', { setValueAs: toNumberOrNull })}
            />
          </div>
          <div className={styles.grid2}>
            <TextField
              id={FIELD_IDS.averageRating}
              label="Rating (0-5)"
              type="number"
              inputMode="decimal"
              step={0.1}
              min={0}
              max={5}
              hint="0 to 5, one decimal."
              error={fieldMessage(errors.averageRating, '', 'Enter a rating between 0 and 5.')}
              {...register('averageRating', { setValueAs: toNumberOrNull })}
            />
            <TextField
              id={FIELD_IDS.coverUrl}
              label="Cover URL"
              type="url"
              placeholder="https://…"
              hint="Leave empty to use the Open Library cover for the ISBN."
              error={fieldMessage(errors.coverUrl, '', 'Enter a full URL, e.g. https://example.com/cover.jpg.')}
              {...register('coverUrl', { setValueAs: (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null) })}
            />
          </div>
          <TextArea
            id={FIELD_IDS.description}
            label="Description"
            rows={6}
            hint={`${description.length} / ${DESCRIPTION_MAX}`}
            error={fieldMessage(errors.description, '', `Description is too long (${DESCRIPTION_MAX} characters max).`)}
            {...register('description')}
          />
        </fieldset>

        <div className={styles.actions}>
          <button type="button" className="btn btn-secondary" onClick={cancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={save.isPending}>
            {save.isPending && <span className={styles.spinner} aria-hidden="true" />}
            {save.isPending ? 'Saving…' : book ? 'Save changes' : 'Create book'}
          </button>
        </div>
      </div>

      <aside className={styles.preview} aria-label="Live preview">
        <span className="eyebrow">Live preview</span>
        <div className={styles.previewCard}>
          <div className={styles.previewCover}>
            <Cover key={previewBook.coverUrl ?? ''} book={previewBook} />
          </div>
          <div className={styles.previewText}>
            <strong className={styles.previewTitle}>{previewBook.title}</strong>
            {previewAuthors && <span className={styles.previewAuthors}>{previewAuthors}</span>}
            {selectedGenres.length > 0 && (
              <span className={styles.previewTags}>
                {selectedGenres.slice(0, 3).map((name) => (
                  <span key={name} className="tag">
                    {name}
                  </span>
                ))}
              </span>
            )}
          </div>
        </div>
        <p className={styles.hint}>Updates as you type. The cloth colour comes from the title.</p>
      </aside>
    </form>
  )
}
