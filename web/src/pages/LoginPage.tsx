import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRightToBracket, faEnvelope, faLock, faShieldHalved } from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../hooks/AuthContext'
import { publicUrl } from '../utils/publicUrl'

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  if (user?.verified) {
    return <Navigate to="/" replace />
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    login(email.trim(), password)
    navigate((location.state as { from?: string } | null)?.from || '/', { replace: true })
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
            Email address
            <span>
              <FontAwesomeIcon icon={faEnvelope} />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                required
              />
            </span>
          </label>

          <label>
            Password
            <span>
              <FontAwesomeIcon icon={faLock} />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter password"
                required
              />
            </span>
          </label>

          <button type="submit">
            <FontAwesomeIcon icon={faArrowRightToBracket} />
            Login
          </button>
        </form>

        <p className="auth-switch">
          New to Hydro-M? <Link to="/request-access">Sign up</Link>
        </p>
      </section>
    </main>
  )
}
