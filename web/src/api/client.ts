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

  const response = await fetch(`${API_BASE_URL}/api/auth/csrf/`, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })
  token = readCookie('csrftoken')
  if (token) return token
  try {
    const body = (await response.json()) as { csrfToken?: string; csrf_token?: string }
    return body.csrfToken || body.csrf_token || null
  } catch {
    return null
  }
}

function fallbackErrorMessage(status: number): string {
  if (status === 400) {
    return 'This request was rejected by the server. Refresh the page and try again.'
  }
  if (status === 403) {
    return 'Access denied. Refresh the page and try again. If you just signed up, wait for administrator approval.'
  }
  if (status === 404) {
    return 'No account was found for that email. Please sign up first.'
  }
  if (status === 500 || status === 502 || status === 503) {
    return 'The server could not complete this request. Please try again in a moment.'
  }
  return `Request failed (${status})`
}

async function parseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: string; error?: string; message?: string }
    return body.detail || body.error || body.message || fallbackErrorMessage(response.status)
  } catch {
    return fallbackErrorMessage(response.status)
  }
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
