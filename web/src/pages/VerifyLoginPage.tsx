import { Link } from 'react-router-dom'

/** Legacy email-verify route; approval is now done by an administrator. */
export function VerifyLoginPage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-heading centered">
          <p className="page-eyebrow">Approval required</p>
          <h1>Email verification is no longer used</h1>
          <p>
            Hydro-M accounts are activated by an administrator. After your request is approved, sign
            in with your email and password.
          </p>
        </div>
        <Link className="auth-primary-link" to="/login">
          Go to login
        </Link>
        <p className="auth-switch">
          Need an account? <Link to="/request-access">Sign up</Link>
        </p>
      </section>
    </main>
  )
}
