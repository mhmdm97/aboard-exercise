# AI usage: raw notes

Scratch notes for the author while writing the "AI usage" section of the root `DECISIONS.md`.
Each entry is a place where AI-generated work was wrong, incomplete, or changed after review. Delete this file once the section is written.

## Corrections caught in review

- **Missing correlation id.** The AI-built backend logged every request with Fastify's internal per-process ids (`req-1`, `req-2`, …). It neither accepted nor returned an `X-Request-Id`, so one request couldn't be traced from nginx to the API logs. Caught when I asked "what are we doing for logging?". Fix: read or validate an incoming `X-Request-Id`, otherwise generate a UUID; return it in the response; nginx forwards its `$request_id`.

- **Fuzzy search couldn't use its own index.** The AI created GIN trigram indexes on `books.title` and `authors.name`. It then wrote the fuzzy filter as `word_similarity(q, title) > 0.4`, a *function* comparison that Postgres can't serve from a GIN index. The index only helped the `ILIKE` branch. Invisible at 351 rows, but a full table scan at scale. Caught during the search walkthrough. Fix: filter with the index-supported operator `q <% title`, with the threshold set transaction-locally (`set_config('pg_trgm.word_similarity_threshold', '0.4', true)`); keep `word_similarity()` only for ranking. Confirmed with `EXPLAIN` (Bitmap Index Scan).

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
