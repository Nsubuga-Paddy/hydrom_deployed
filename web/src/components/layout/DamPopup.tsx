import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronRight, faTimes } from '@fortawesome/free-solid-svg-icons'
import { damPath } from '../../data/dams'
import { useDams } from '../../hooks/DamsContext'
import { publicUrl } from '../../utils/publicUrl'

interface DamPopupProps {
  open: boolean
  onClose: () => void
}

export function DamPopup({ open, onClose }: DamPopupProps) {
  const { dams, status, error, refresh } = useDams()

  if (!open) return null

  return (
    <div className="dam-popup-modal show">
      <div className="dam-popup-content">
        <div className="dam-popup-header">
          <h3>Select a Dam</h3>
          <button type="button" className="dam-popup-close" onClick={onClose} aria-label="Close">
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        <div className="dam-popup-body">
          <div className="dam-popup-list">
            {status === 'loading' && dams.length === 0 && (
              <p className="dam-list-status">Loading dams…</p>
            )}
            {status === 'error' && dams.length === 0 && (
              <div className="dam-list-status error">
                <p>{error || 'Unable to load dams.'}</p>
                <button type="button" onClick={refresh}>
                  Retry
                </button>
              </div>
            )}
            {status === 'ready' && dams.length === 0 && (
              <p className="dam-list-status">No dams uploaded in admin yet.</p>
            )}
            {dams.map((dam) => (
              <Link
                key={dam.id}
                to={damPath(dam.id, 'realtime')}
                className="dam-popup-item"
                onClick={onClose}
              >
                <div className="dam-popup-icon">
                  <img src={publicUrl('dam.png')} alt="" />
                </div>
                <div className="dam-popup-info">
                  <h4>{dam.name}</h4>
                  <p>
                    {dam.location
                      ? `${dam.location} - Real-time Monitoring`
                      : 'Hydroelectric Power Plant'}
                  </p>
                  <div className="dam-popup-status">
                    <span className="status-indicator active" />
                    <span>Operational</span>
                  </div>
                </div>
                <div className="dam-popup-arrow">
                  <FontAwesomeIcon icon={faChevronRight} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <button type="button" className="dam-popup-overlay" onClick={onClose} aria-label="Close overlay" />
    </div>
  )
}
