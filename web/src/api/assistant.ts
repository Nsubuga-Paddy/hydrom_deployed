import { API_BASE_URL, apiPost } from './client'

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
  return apiPost<AssistantChatResponse>('/api/assistant/chat/', { messages })
}

export function assistantReportUrl(downloadPath: string) {
  if (downloadPath.startsWith('http://') || downloadPath.startsWith('https://')) {
    return downloadPath
  }
  return `${API_BASE_URL}${downloadPath}`
}
