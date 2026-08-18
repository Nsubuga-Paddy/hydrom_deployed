import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCircleCheck,
  faPaperPlane,
  faShieldHalved,
} from '@fortawesome/free-solid-svg-icons'
import { ApiError } from '../api/client'
import { useAuth } from '../hooks/AuthContext'
import { publicUrl } from '../utils/publicUrl'

const stations = ['Nalubaale HPP', 'Kiira HPP', 'Bujagali HPP', 'Isimba HPP', 'Headquarters', 'Other']

export function RequestAccessPage() {
  const { requestAccess } = useAuth()
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    station: '',
    role: '',
    password: '',
    confirmPassword: '',
  })

  const passwordsMatch = Boolean(form.password && form.password === form.confirmPassword)

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!passwordsMatch) return

    setError(null)
    setSubmitting(true)
    try {
      await requestAccess({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        department: form.department.trim(),
        station: form.station,
        role: form.role.trim(),
        password: form.password,
      })
      setSubmittedEmail(form.email.trim())
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create your account. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submittedEmail) {
    return (
      <main className="auth-page">
        <section className="auth-card auth-card-wide">
          <div className="auth-success-icon">
            <FontAwesomeIcon icon={faCircleCheck} />
          </div>
          <div className="auth-heading centered">
            <p className="page-eyebrow">Sign up complete</p>
            <h1>Account created</h1>
            <p>
              <strong>{submittedEmail}</strong> is pending admin approval. You can sign in once it is
              approved.
            </p>
          </div>

          <p className="auth-switch">
            <Link to="/login">Return to login</Link>
          </p>
        </section>
      </main>
    )
  }

  return (
    <main className="auth-page">
      <section className="auth-card auth-card-wide">
        <div className="auth-brand">
          <img src={publicUrl('logo.png')} alt="Hydro-M" />
          <span>
            <FontAwesomeIcon icon={faShieldHalved} />
            Sign up
          </span>
        </div>

        <div className="auth-heading">
          <p className="page-eyebrow">Hydro-M Signup</p>
          <p>Create an account. An admin must approve it before you can sign in.</p>
        </div>

        <form className="auth-form auth-form-grid" onSubmit={handleSubmit}>
          <label>
            Full name
            <input
              type="text"
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              placeholder="e.g. Jane N."
              required
            />
          </label>

          <label>
            Email address
            <input
              type="email"
              value={form.email}
              onChange={(event) => updateField('email', event.target.value)}
              placeholder="name@example.com"
              autoComplete="email"
              required
            />
          </label>

          <label>
            Phone number
            <input
              type="tel"
              value={form.phone}
              onChange={(event) => updateField('phone', event.target.value)}
              placeholder="+256 ..."
              required
            />
          </label>

          <label>
            Department / unit
            <input
              type="text"
              value={form.department}
              onChange={(event) => updateField('department', event.target.value)}
              placeholder="e.g. Operations"
              required
            />
          </label>

          <label>
            Station / site
            <select
              value={form.station}
              onChange={(event) => updateField('station', event.target.value)}
              required
            >
              <option value="" disabled>
                Select station
              </option>
              {stations.map((station) => (
                <option key={station}>{station}</option>
              ))}
            </select>
          </label>

          <label>
            Job role / title
            <input
              type="text"
              value={form.role}
              onChange={(event) => updateField('role', event.target.value)}
              placeholder="e.g. Plant Operator"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(event) => updateField('password', event.target.value)}
              placeholder="Create password"
              minLength={8}
              autoComplete="new-password"
              required
            />
          </label>

          <label>
            Confirm password
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(event) => updateField('confirmPassword', event.target.value)}
              placeholder="Confirm password"
              minLength={8}
              autoComplete="new-password"
              required
            />
          </label>

          {!passwordsMatch && form.confirmPassword ? (
            <p className="auth-form-error">Passwords must match before the request is submitted.</p>
          ) : null}

          {error ? <p className="auth-form-error">{error}</p> : null}

          <button type="submit" disabled={!passwordsMatch || submitting}>
            <FontAwesomeIcon icon={faPaperPlane} />
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </section>
    </main>
  )
}
