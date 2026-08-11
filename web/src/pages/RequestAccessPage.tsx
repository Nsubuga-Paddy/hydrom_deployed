import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCircleCheck,
  faEnvelope,
  faPaperPlane,
  faShieldHalved,
} from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../hooks/AuthContext'
import { publicUrl } from '../utils/publicUrl'

const stations = ['Nalubaale HPP', 'Kiira HPP', 'Bujagali HPP', 'Isimba HPP', 'Headquarters', 'Other']

export function RequestAccessPage() {
  const { requestAccess } = useAuth()
  const [submittedEmail, setSubmittedEmail] = useState('')
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

  const passwordsMatch = form.password && form.password === form.confirmPassword
  const mockLoginLink = useMemo(
    () => `/verify-login?email=${encodeURIComponent(submittedEmail)}`,
    [submittedEmail],
  )

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!passwordsMatch) return

    requestAccess({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      department: form.department.trim(),
      station: form.station,
      role: form.role.trim(),
    })
    setSubmittedEmail(form.email.trim())
  }

  if (submittedEmail) {
    return (
      <main className="auth-page">
        <section className="auth-card auth-card-wide">
          <div className="auth-success-icon">
            <FontAwesomeIcon icon={faCircleCheck} />
          </div>
          <div className="auth-heading centered">
            <p className="page-eyebrow">Verification email sent</p>
            <h1>Check your email for the Hydro-M login link</h1>
            <p>
              We sent a login link to <strong>{submittedEmail}</strong>. Opening that link verifies
              the email and grants access to the platform.
            </p>
          </div>

          <div className="auth-email-preview">
            <span>
              <FontAwesomeIcon icon={faEnvelope} />
              Mock email preview
            </span>
            <p>
              In production, this link will be delivered by email. For now, use the mock login link
              below to simulate email verification.
            </p>
            <Link to={mockLoginLink}>Open mock login link</Link>
          </div>

          <p className="auth-switch">
            Already verified? <Link to="/login">Return to login</Link>
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
          <p>Register a valid email to which a verification link will be sent.</p>
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
              required
            />
          </label>

          {!passwordsMatch && form.confirmPassword ? (
            <p className="auth-form-error">Passwords must match before the request is submitted.</p>
          ) : null}

          <button type="submit" disabled={!passwordsMatch}>
            <FontAwesomeIcon icon={faPaperPlane} />
            Send verification email
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </section>
    </main>
  )
}
