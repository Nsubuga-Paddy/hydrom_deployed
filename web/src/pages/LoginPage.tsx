import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRightToBracket, faEnvelope, faLock, faShieldHalved } from '@fortawesome/free-solid-svg-icons'
import { ApiError } from '../api/client'
import { useAuth } from '../hooks/AuthContext'
import { publicUrl } from '../utils/publicUrl'

export function LoginPage() {
  const { user, status, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (status === 'loading') {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <p>Checking your session…</p>
        </section>
      </main>
    )
  }

  if (user?.verified) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email.trim(), password)
      navigate((location.state as { from?: string } | null)?.from || '/', { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 400) {
          setError(
            err.message ||
              'Sign-in was blocked by the server. Refresh the page and try again.',
          )
        } else if (err.status === 403) {
          setError(
            err.message ||
              'Access denied. If you recently signed up, wait for an administrator to approve your account.',
          )
        } else if (err.status >= 500) {
          setError(err.message || 'The server failed while signing you in. Please try again in a moment.')
        } else {
          setError(err.message)
        }
      } else {
        setError('Unable to sign in. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <img src={publicUrl('logo.png')} alt="Hydro-M" />
          <span>
            <FontAwesomeIcon icon={faShieldHalved} />
            Verified access
          </span>
        </div>

        <div className="auth-heading">
          <p className="page-eyebrow">Hydro-M Login</p>
          <h1 className="auth-title-soft">Dam cascade activity monitoring</h1>
          <p>Realtime activity, GIS monitoring, and water-level predictions for the cascade.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Email or username
            <span className="auth-input-icon">
              <FontAwesomeIcon icon={faEnvelope} />
              <input
                type="text"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com or admin username"
                autoComplete="username"
                required
              />
            </span>
          </label>

          <label>
            Password
            <span className="auth-input-icon">
              <FontAwesomeIcon icon={faLock} />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
                required
              />
            </span>
          </label>

          {error ? <p className="auth-form-error">{error}</p> : null}

          <button type="submit" disabled={submitting}>
            <FontAwesomeIcon icon={faArrowRightToBracket} />
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="auth-switch">
          Need an account? <Link to="/request-access">Sign up</Link>
        </p>
      </section>
    </main>
  )
}
