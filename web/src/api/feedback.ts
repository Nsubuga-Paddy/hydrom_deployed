import { API_BASE_URL, ApiError } from './client'

export interface FeedbackPayload {
  name: string
  email?: string
  department?: string
  area: string
  priority: 'low' | 'normal' | 'high' | 'critical'
  message: string
}

export interface FeedbackResponse {
  message: string
  id: number
  createdAt: string
}

export async function submitFeedback(payload: FeedbackPayload): Promise<FeedbackResponse> {
  const response = await fetch(`${API_BASE_URL}/api/feedback/`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    let detail = `Request failed (${response.status})`
    try {
      const body = (await response.json()) as { error?: string; detail?: string }
      detail = body.error || body.detail || detail
    } catch {
      // ignore non-JSON bodies
    }
    throw new ApiError(detail, response.status)
  }

  return (await response.json()) as FeedbackResponse
}
