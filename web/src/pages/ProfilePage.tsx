import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBuilding,
  faCircleCheck,
  faEnvelope,
  faIdBadge,
  faLocationDot,
  faPhone,
  faUser,
} from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../hooks/AuthContext'

const fallback = 'Not provided'

export function ProfilePage() {
  const { user } = useAuth()

  const profileDetails = [
    {
      icon: faEnvelope,
      label: 'Email address',
      value: user?.email || fallback,
    },
    {
      icon: faPhone,
      label: 'Phone number',
      value: user?.phone || fallback,
    },
    {
      icon: faBuilding,
      label: 'Department / unit',
      value: user?.department || fallback,
    },
    {
      icon: faLocationDot,
      label: 'Station / site',
      value: user?.station || fallback,
    },
    {
      icon: faIdBadge,
      label: 'Job role / title',
      value: user?.role || fallback,
    },
  ]

  return (
    <div className="profile-page">
      <section className="profile-hero">
        <div className="profile-avatar">
          <FontAwesomeIcon icon={faUser} />
        </div>
        <div>
          <p className="page-eyebrow">User profile</p>
          <h1>{user?.name || 'Hydro-M User'}</h1>
          <p>Verified Hydro-M account used to access cascade monitoring data and tools.</p>
        </div>
        <span className="profile-status">
          <FontAwesomeIcon icon={faCircleCheck} />
          Verified
        </span>
      </section>

      <section className="profile-details-card">
        <div className="profile-section-header">
          <p className="page-eyebrow">Account details</p>
          <h2>Profile information</h2>
        </div>

        <div className="profile-detail-grid">
          {profileDetails.map((item) => (
            <article key={item.label} className="profile-detail-item">
              <span>
                <FontAwesomeIcon icon={item.icon} />
              </span>
              <div>
                <small>{item.label}</small>
                <strong>{item.value}</strong>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
