import { vi } from 'vitest'

interface Reply {
  status?: number
  body?: unknown
}

const notFound: Reply = { status: 404, body: { error: { code: 'NOT_FOUND', message: 'Not found' } } }

/** Keys are `METHOD /path` (query string ignored). Unmatched requests answer 404. */
export function mockApi(handlers: Record<string, Reply | (() => Reply)>) {
  const fetchMock = vi.fn<typeof fetch>((input, init) => {
    const method = init?.method ?? 'GET'
    const path = String(input).split('?')[0]
    const handler = handlers[`${method} ${path}`]
    const reply = typeof handler === 'function' ? handler() : (handler ?? notFound)
    const status = reply.status ?? 200
    const body = status === 204 || reply.body === undefined ? null : JSON.stringify(reply.body)
    return Promise.resolve(new Response(body, { status }))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/** The `METHOD /path` of every request made so far. */
export const calls = (fetchMock: ReturnType<typeof mockApi>) =>
  fetchMock.mock.calls.map(([url, init]) => `${init?.method ?? 'GET'} ${String(url).split('?')[0]}`)

export const member = { id: '44444444-4444-4444-8444-444444444441', email: 'm@x.io', name: 'Mia', role: 'member' as const }
export const admin = { id: '44444444-4444-4444-8444-444444444442', email: 'a@x.io', name: 'Ada', role: 'admin' as const }
export const unauthorized: Reply = {
  status: 401,
  body: { error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } },
}
