/** Base URL for API calls. In dev, Vite proxies `/api` to Django. */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) || ''

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1')}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

async function ensureCsrfCookie(): Promise<string | null> {
  let token = readCookie('csrftoken')
  if (token) return token

  await fetch(`${API_BASE_URL}/api/auth/csrf/`, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })
  token = readCookie('csrftoken')
  return token
}

async function parseError(response: Response): Promise<string> {
  let detail = `Request failed (${response.status})`
  try {
    const body = (await response.json()) as { detail?: string; error?: string; message?: string }
    detail = body.detail || body.error || body.message || detail
  } catch {
    // ignore non-JSON error bodies
  }
  return detail
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`
  const response = await fetch(url, {
    ...init,
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(init?.headers || {}),
    },
  })

  if (!response.ok) {
    throw new ApiError(await parseError(response), response.status)
  }

  return (await response.json()) as T
}

export async function apiPost<T>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
  const csrfToken = await ensureCsrfCookie()
  const url = `${API_BASE_URL}${path}`
  const response = await fetch(url, {
    ...init,
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
      ...(init?.headers || {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (!response.ok) {
    throw new ApiError(await parseError(response), response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}
