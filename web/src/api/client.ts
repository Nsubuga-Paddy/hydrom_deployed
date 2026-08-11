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

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`
  const response = await fetch(url, {
    ...init,
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...(init?.headers || {}),
    },
  })

  if (!response.ok) {
    let detail = `Request failed (${response.status})`
    try {
      const body = (await response.json()) as { detail?: string; error?: string }
      detail = body.detail || body.error || detail
    } catch {
      // ignore non-JSON error bodies
    }
    throw new ApiError(detail, response.status)
  }

  return (await response.json()) as T
}
