import { API_BASE_URL, ApiError } from './client'

export interface AssistantChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AssistantAttachment {
  type: 'report'
  filename: string
  downloadPath: string
  label?: string
}

export interface AssistantChatResponse {
  reply: string
  attachments: AssistantAttachment[]
  provider: 'openai' | 'fallback' | string
}

export async function sendAssistantChat(
  messages: AssistantChatMessage[],
): Promise<AssistantChatResponse> {
  const response = await fetch(`${API_BASE_URL}/api/assistant/chat/`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages }),
  })

  if (!response.ok) {
    let detail = `Request failed (${response.status})`
    try {
      const body = (await response.json()) as { error?: string; detail?: string }
      detail = body.error || body.detail || detail
    } catch {
      // ignore
    }
    throw new ApiError(detail, response.status)
  }

  return (await response.json()) as AssistantChatResponse
}

export function assistantReportUrl(downloadPath: string) {
  if (downloadPath.startsWith('http://') || downloadPath.startsWith('https://')) {
    return downloadPath
  }
  return `${API_BASE_URL}${downloadPath}`
}
