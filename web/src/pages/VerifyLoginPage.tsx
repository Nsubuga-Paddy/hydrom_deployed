import { useEffect } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleCheck, faShieldHalved } from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../hooks/AuthContext'

export function VerifyLoginPage() {
  const [searchParams] = useSearchParams()
  const { user, verifyFromEmailLink } = useAuth()
  const email = searchParams.get('email') || ''

  useEffect(() => {
    if (email) verifyFromEmailLink(email)
  }, [email, verifyFromEmailLink])

  if (!email) {
    return <Navigate to="/login" replace />
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-success-icon">
          <FontAwesomeIcon icon={faCircleCheck} />
        </div>
        <div className="auth-heading centered">
          <p className="page-eyebrow">Email verified</p>
          <h1>Welcome to Hydro-M</h1>
          <p>
            <FontAwesomeIcon icon={faShieldHalved} /> {user?.email || email} has been verified by
            the email login link.
          </p>
        </div>
        <Link className="auth-primary-link" to="/">
          Continue to dashboard
        </Link>
      </section>
    </main>
  )
}
