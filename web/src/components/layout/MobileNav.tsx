import { Link, useParams } from 'react-router-dom'
import type { RefObject } from 'react'
import { damPath } from '../../data/dams'
import { formatSensorValue } from '../../data/display'
import { useDams } from '../../hooks/DamsContext'
import { publicUrl } from '../../utils/publicUrl'

interface MobileNavProps {
  open: boolean
  onClose: () => void
  navRef?: RefObject<HTMLDivElement | null>
}

/** Left cascade sidebar — dam list only (page links live in the top navbar / mobile menu). */
export function MobileNav({ open, onClose, navRef }: MobileNavProps) {
  const { damId } = useParams()
  const { dams, status, error, refresh } = useDams()

  return (
    <div ref={navRef} className={`mobile-nav${open ? ' show' : ''}`}>
      <div className="dam-sidebar">
        <div className="dam-sidebar-header">
          <h3>THE CASCADE</h3>
          <p>Real-time dam status and data</p>
        </div>
        <div className="dam-list">
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
              className={`dam-item${dam.featured ? ' featured' : ''}${damId === dam.id ? ' active' : ''}`}
              onClick={onClose}
            >
              <div className="dam-icon">
                <img src={publicUrl('dam.png')} alt="" />
              </div>
              <div className="dam-info">
                <h4>{dam.name}</h4>
                {dam.location && <p className="location">{dam.location}</p>}
                <div className="dam-status">
                  <div className="status-item">
                    <span className="status-label">Reservoir:</span>
                    <span className="status-value">
                      {formatSensorValue(dam.reservoirWaterLevel)}
                    </span>
                  </div>
                  <div className="status-item">
                    <span className="status-label">Head race:</span>
                    <span className="status-value">{formatSensorValue(dam.headRaceWaterLevel)}</span>
                  </div>
                  <div className="status-item">
                    <span className="status-label">Tail race:</span>
                    <span className="status-value">{formatSensorValue(dam.tailRaceWaterLevel)}</span>
                  </div>
                  <div className="status-item">
                    <span className="status-label">Dispatch:</span>
                    <span className="status-value">{formatSensorValue(dam.dispatch)}</span>
                  </div>
                  <div className="status-item">
                    <span className="status-label">Discharge:</span>
                    <span className="status-value">{formatSensorValue(dam.discharge)}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
