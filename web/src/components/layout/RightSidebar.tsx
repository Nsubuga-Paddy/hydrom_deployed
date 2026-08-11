import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDownload, faPaperPlane, faRobot, faXmark } from '@fortawesome/free-solid-svg-icons'
import { ApiError } from '../../api/client'
import {
  assistantReportUrl,
  sendAssistantChat,
  type AssistantAttachment,
} from '../../api/assistant'

interface AssistantMessage {
  id: number
  role: 'assistant' | 'user'
  text: string
  attachments?: AssistantAttachment[]
}

const initialMessages: AssistantMessage[] = [
  {
    id: 1,
    role: 'assistant',
    text: 'Hello, I am Hydro-M Assistant. Ask me about dam levels, history summaries, data availability, or request a CSV report.',
  },
]

export function RightSidebar() {
  const [messages, setMessages] = useState<AssistantMessage[]>(initialMessages)
  const [input, setInput] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const messagesRef = useRef<HTMLDivElement | null>(null)
  const stickToBottomRef = useRef(true)

  function updateStickToBottom() {
    const node = messagesRef.current
    if (!node) return
    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight
    stickToBottomRef.current = distanceFromBottom < 72
  }

  useEffect(() => {
    const node = messagesRef.current
    if (!node || !stickToBottomRef.current) return
    node.scrollTop = node.scrollHeight
  }, [messages, sending])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const question = input.trim()
    if (!question || sending) return

    const userMessage: AssistantMessage = {
      id: Date.now(),
      role: 'user',
      text: question,
    }

    stickToBottomRef.current = true
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setInput('')
    setSending(true)

    try {
      const history = nextMessages
        .filter((message) => !(message.id === 1 && message.role === 'assistant'))
        .map((message) => ({ role: message.role, content: message.text }))

      const response = await sendAssistantChat(history)
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: 'assistant',
          text: response.reply,
          attachments: response.attachments || [],
        },
      ])
    } catch (err) {
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: 'assistant',
          text:
            err instanceof ApiError
              ? err.message
              : 'Unable to reach Hydro-M Assistant right now. Please try again.',
        },
      ])
    } finally {
      setSending(false)
    }
  }

  return (
    <aside className={`right-sidebar${mobileOpen ? ' assistant-mobile-open' : ''}`}>
      <button
        type="button"
        className="assistant-fab"
        aria-label="Open Hydro-M Assistant"
        onClick={() => setMobileOpen(true)}
      >
        <FontAwesomeIcon icon={faRobot} />
      </button>

      <div className="assistant-panel">
        <div className="assistant-header">
          <div className="assistant-avatar">
            <FontAwesomeIcon icon={faRobot} />
          </div>
          <div>
            <h3>Hydro-M Assistant</h3>
            <p>Database-backed operational insights</p>
          </div>
          <button
            type="button"
            className="assistant-close"
            aria-label="Close Hydro-M Assistant"
            onClick={() => setMobileOpen(false)}
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <div
          className="assistant-messages"
          aria-live="polite"
          ref={messagesRef}
          onScroll={updateStickToBottom}
        >
          {messages.map((message) => (
            <div key={message.id} className={`assistant-message ${message.role}`}>
              <div>{message.text}</div>
              {message.attachments?.map((attachment) => (
                <a
                  key={attachment.filename}
                  className="assistant-attachment"
                  href={assistantReportUrl(attachment.downloadPath)}
                  download={attachment.filename}
                >
                  <FontAwesomeIcon icon={faDownload} />
                  {attachment.label || attachment.filename}
                </a>
              ))}
            </div>
          ))}
          {sending && (
            <div className="assistant-message thinking" aria-label="Assistant is typing">
              <span className="assistant-typing-bubbles" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </div>
          )}
        </div>

        <form className="assistant-input-form" onSubmit={handleSubmit}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about levels, history, reports..."
            aria-label="Ask Hydro-M Assistant"
            disabled={sending}
          />
          <button type="submit" aria-label="Send message" disabled={sending || !input.trim()}>
            <FontAwesomeIcon icon={faPaperPlane} />
          </button>
        </form>
      </div>
    </aside>
  )
}
