# AI usage: raw notes

Scratch notes for the author while writing the "AI usage" section of the root `DECISIONS.md`.
Each entry is a place where AI-generated work was wrong, incomplete, or changed after review. Delete this file once the section is written.

## Corrections caught in review

- **Missing correlation id.** The AI-built backend logged every request with Fastify's internal per-process ids (`req-1`, `req-2`, …). It neither accepted nor returned an `X-Request-Id`, so one request couldn't be traced from nginx to the API logs. Caught when I asked "what are we doing for logging?". Fix: read or validate an incoming `X-Request-Id`, otherwise generate a UUID; return it in the response; nginx forwards its `$request_id`.

- **Fuzzy search couldn't use its own index.** The AI created GIN trigram indexes on `books.title` and `authors.name`. It then wrote the fuzzy filter as `word_similarity(q, title) > 0.4`, a *function* comparison that Postgres can't serve from a GIN index. The index only helped the `ILIKE` branch. Invisible at 351 rows, but a full table scan at scale. Caught during the search walkthrough. Fix: filter with the index-supported operator `q <% title`, with the threshold set transaction-locally (`set_config('pg_trgm.word_similarity_threshold', '0.4', true)`); keep `word_similarity()` only for ranking. Confirmed with `EXPLAIN` (Bitmap Index Scan).

- **The AI's own security fix broke login in dev, and its review claimed it couldn't.** The security pass added an Origin check for unsafe methods: reject if `Origin` doesn't match `Host`. It explicitly reasoned that the Vite dev proxy has "no `changeOrigin`" so it would pass. That was wrong: Vite's string-form proxy target implies `changeOrigin: true`, so the backend saw `Host: localhost:5000` against `Origin: localhost:5173`, and every login/POST in `npm run dev` returned 403. Its tests passed because `app.inject()` and curl send no `Origin` header. A later agent hit it while driving a real browser. Lesson: verify security changes end-to-end in a real browser, not only via injected requests. Fix: object proxy with `changeOrigin: false`.

- **Anonymous `/api/auth/me` returned 401**, which every guest page load logged as a console error (Lighthouse Best Practices 100 → 92). Changed to `200 { user: null }`.

## Corrections already mentioned in DECISIONS.md (for reference)

- react-router 8 installed instead of the requested 7 (kept, but logged).
- Lockfile churn from the sandbox's npm version reverted before commit.
- Relevance sort first implemented by inspecting the raw URL; replaced by making `sort` optional in the shared schema.
- `useFieldArray` doesn't fit `string[]`; authors list controlled with `useWatch` + `setValue`.
- Dockerfiles first committed unverified; I required a real `docker compose up` before accepting.
- Seed ISBNs written from memory had bad check digits; repaired by script.

## Found by the AI security review of AI-written code (optional to mention)

- `coverUrl` accepted `javascript:` / `data:` URLs (`z.url()` allows any scheme) → http(s) only.
- No log redaction for cookies / `set-cookie` → pino `redact`.
- Expired sessions never purged → cleanup on login.
- nginx sent no security headers → CSP, nosniff, frame-blocking, `server_tokens off`.

## Found via my Lighthouse runs (optional to mention)

- **CSP violation from Zod 4.** The unexplained "Content security policy" issue was Zod 4's JIT probe (`new Function('')` in a try/catch), blocked by our `script-src 'self'` and reported by Chrome on every page. Fixed with `z.config({ jitless: true })` before any schema is built, rather than loosening the CSP with `unsafe-eval`.
- **LCP:** covers above the fold were `loading="lazy"`; fixed with eager loading + `fetchpriority="high"` for the first row, preconnect, and route-level code-splitting (main bundle 156 → 108 kB gzip). Performance 83 → 95.
