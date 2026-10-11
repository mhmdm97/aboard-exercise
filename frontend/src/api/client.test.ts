import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiDelete, apiGet, apiPost } from './client'

function mockFetch(response: Response) {
  const fn = vi.fn().mockResolvedValue(response)
  vi.stubGlobal('fetch', fn)
  return fn
}

afterEach(() => vi.unstubAllGlobals())

describe('api client', () => {
  it('parses a successful JSON response and sends credentials', async () => {
    const fetchMock = mockFetch(Response.json({ ok: true }))
    await expect(apiGet<{ ok: boolean }>('/api/x')).resolves.toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/x',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    )
  })

  it('sends JSON bodies', async () => {
    const fetchMock = mockFetch(Response.json({ id: 1 }, { status: 201 }))
    await apiPost('/api/x', { a: 1 })
    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect(init.body).toBe('{"a":1}')
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' })
  })

  it('returns undefined for 204', async () => {
    mockFetch(new Response(null, { status: 204 }))
    await expect(apiDelete('/api/x')).resolves.toBeUndefined()
  })

  it('throws ApiError parsed from the backend error shape', async () => {
    mockFetch(
      Response.json(
        { error: { code: 'validation_error', message: 'Bad input', details: { title: 'required' } } },
        { status: 400 },
      ),
    )
    const err = await apiGet('/api/x').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({
      status: 400,
      code: 'validation_error',
      message: 'Bad input',
      details: { title: 'required' },
    })
  })

  it('falls back to statusText when the body is not the error shape', async () => {
    mockFetch(new Response('oops', { status: 502, statusText: 'Bad Gateway' }))
    const err = await apiGet('/api/x').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({ status: 502, code: 'http_error', message: 'Bad Gateway' })
  })
})
