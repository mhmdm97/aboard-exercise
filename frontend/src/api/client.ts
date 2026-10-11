// Base URL is empty in dev (Vite proxies /api to the backend).
// Set VITE_API_BASE_URL for other environments.
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

/** Backend error shape: `{ error: { code, message, details? } }`. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

interface ErrorBody {
  error: { code: string; message: string; details?: unknown }
}

function isErrorBody(body: unknown): body is ErrorBody {
  if (typeof body !== 'object' || body === null || !('error' in body)) return false
  const { error } = body
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string' &&
    'message' in error &&
    typeof error.message === 'string'
  )
}

async function toApiError(res: Response): Promise<ApiError> {
  try {
    const body: unknown = await res.json()
    if (isErrorBody(body)) {
      const { code, message, details } = body.error
      return new ApiError(res.status, code, message, details)
    }
  } catch {
    // body was not JSON; fall through
  }
  return new ApiError(res.status, 'http_error', res.statusText || `HTTP ${res.status}`)
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!res.ok) throw await toApiError(res)
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const apiGet = <T>(path: string) => request<T>('GET', path)
export const apiPost = <T>(path: string, body?: unknown) => request<T>('POST', path, body)
export const apiPut = <T>(path: string, body?: unknown) => request<T>('PUT', path, body)
export const apiPatch = <T>(path: string, body?: unknown) => request<T>('PATCH', path, body)
export const apiDelete = <T = void>(path: string) => request<T>('DELETE', path)
