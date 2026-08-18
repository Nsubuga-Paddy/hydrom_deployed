import { apiPost } from './client'

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
  return apiPost<FeedbackResponse>('/api/feedback/', payload)
}
