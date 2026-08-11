import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBug,
  faChartLine,
  faCircleCheck,
  faComments,
  faGaugeHigh,
  faLightbulb,
  faPaperPlane,
  faUserShield,
} from '@fortawesome/free-solid-svg-icons'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../api/client'
import { submitFeedback } from '../api/feedback'
import { useAuth } from '../hooks/AuthContext'

const feedbackAreas = [
  {
    icon: faGaugeHigh,
    title: 'Dashboard experience',
    text: 'Navigation, layout, mobile usability, data readability, and general workflow feedback.',
  },
  {
    icon: faChartLine,
    title: 'Monitoring data',
    text: 'Realtime readings, predictions, GIS views, alarms, and open-channel monitoring observations.',
  },
  {
    icon: faLightbulb,
    title: 'Improvement ideas',
    text: 'Suggestions that would make Hydro-M more useful for UEGCL operational teams.',
  },
] as const

const areaOptions = [
  'Dashboard experience',
  'Realtime monitoring',
  'GIS monitoring',
  'Predictions',
  'System alarms',
  'Mobile experience',
  'Other',
] as const

type Priority = 'low' | 'normal' | 'high' | 'critical'

export function ContactUsPage() {
  const { user } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [department, setDepartment] = useState(
    [user?.department, user?.station].filter(Boolean).join(', ') || '',
  )
  const [area, setArea] = useState('')
  const [priority, setPriority] = useState<Priority>('normal')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  useEffect(() => {
    if (user?.name) setName(user.name)
    const dept = [user?.department, user?.station].filter(Boolean).join(', ')
    if (dept) setDepartment(dept)
  }, [user])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setStatus('submitting')
    setStatusMessage(null)

    try {
      await submitFeedback({
        name: name.trim(),
        email: user?.email,
        department: department.trim(),
        area,
        priority,
        message: message.trim(),
      })
      setStatus('success')
      setStatusMessage('Thank you for your contribution.')
      setArea('')
      setPriority('normal')
      setMessage('')
    } catch (err) {
      setStatus('error')
      setStatusMessage(err instanceof ApiError ? err.message : 'Unable to send feedback right now.')
    }
  }

  const canSubmit =
    name.trim().length > 0 && area && message.trim().length >= 10 && status !== 'submitting'

  return (
    <div className="contact-page">
      <section className="contact-hero">
        <div>
          <p className="page-eyebrow">Hydro-M Feedback</p>
          <h1>Help improve the system</h1>
          <p>
            This page is for UEGCL staff using Hydro-M to share feedback about the platform. Report
            issues, suggest improvements, or highlight anything that would make monitoring work
            clearer and faster.
          </p>
        </div>
        <div className="contact-hero-card">
          <FontAwesomeIcon icon={faComments} />
          <span>Internal feedback</span>
          <strong>UEGCL staff</strong>
        </div>
      </section>

      <section className="contact-route-grid" aria-label="Feedback areas">
        {feedbackAreas.map((item) => (
          <article key={item.title} className="contact-route-card">
            <span className="contact-route-icon">
              <FontAwesomeIcon icon={item.icon} />
            </span>
            <h2>{item.title}</h2>
            <p>{item.text}</p>
          </article>
        ))}
      </section>

      <section className="feedback-section">
        <form className="feedback-form" onSubmit={handleSubmit}>
          <div className="feedback-form-header">
            <div>
              <p className="page-eyebrow">Submit feedback</p>
              <h2>Tell us what you noticed</h2>
            </div>
            <span>
              <FontAwesomeIcon icon={faUserShield} />
              Staff use only
            </span>
          </div>

          <div className="feedback-form-grid">
            <label>
              Your name
              <input
                type="text"
                name="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Jane N."
                required
              />
            </label>
            <label>
              Department / station
              <input
                type="text"
                name="department"
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
                placeholder="e.g. Operations, Nalubaale HPP"
              />
            </label>
            <label>
              Feedback area
              <select
                name="area"
                value={area}
                onChange={(event) => setArea(event.target.value)}
                required
              >
                <option value="" disabled>
                  Select an area
                </option>
                {areaOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Priority
              <select
                name="priority"
                value={priority}
                onChange={(event) => setPriority(event.target.value as Priority)}
              >
                <option value="low">Low - suggestion</option>
                <option value="normal">Normal - improvement</option>
                <option value="high">High - affects work</option>
                <option value="critical">Critical - urgent issue</option>
              </select>
            </label>
          </div>

          <label className="feedback-message-field">
            Feedback details
            <textarea
              name="message"
              rows={6}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Describe what happened, what you expected, and where in Hydro-M you noticed it."
              required
              minLength={10}
            />
          </label>

          <div className="feedback-form-footer">
            <p>
              <FontAwesomeIcon icon={faCircleCheck} />
              Feedback helps the Hydro-M team prioritise fixes and improvements for UEGCL users.
            </p>
            <div className="feedback-form-actions">
              {statusMessage && (
                <span className={`feedback-status-message ${status}`}>{statusMessage}</span>
              )}
              <button type="submit" disabled={!canSubmit}>
                <FontAwesomeIcon icon={faPaperPlane} />
                {status === 'submitting' ? 'Sending…' : 'Submit feedback'}
              </button>
            </div>
          </div>
        </form>

        <aside className="feedback-guidance-card">
          <span>
            <FontAwesomeIcon icon={faBug} />
          </span>
          <h2>Useful details to include</h2>
          <p>
            Mention the dam, page, time, reading, alarm, or chart you were viewing. For issues,
            include what you expected to see and what actually happened.
          </p>
        </aside>
      </section>
    </div>
  )
}
