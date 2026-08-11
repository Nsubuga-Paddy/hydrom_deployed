import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBell, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons'
import { getSystemAlarms, getUnreadAlarmCount } from '../../data/alarms'

export function AlarmBell() {
  const [open, setOpen] = useState(false)
  const [pulse, setPulse] = useState(true)
  const rootRef = useRef<HTMLDivElement>(null)
  const alarms = getSystemAlarms()
  const unreadCount = getUnreadAlarmCount(alarms)
  const recentAlarms = alarms.slice(0, 4)

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  useEffect(() => {
    if (unreadCount === 0) return
    const timer = window.setTimeout(() => setPulse(false), 4500)
    return () => window.clearTimeout(timer)
  }, [unreadCount])

  return (
    <div className={`alarm-bell${pulse && unreadCount > 0 ? ' pulse' : ''}`} ref={rootRef}>
      <button
        type="button"
        className="alarm-bell-btn"
        aria-label={`System alarms, ${unreadCount} unread`}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <FontAwesomeIcon icon={faBell} />
        {unreadCount > 0 && <span className="alarm-bell-badge">{unreadCount}</span>}
      </button>

      {open && (
        <div className="alarm-bell-dropdown show">
          <div className="alarm-bell-dropdown-header">
            <strong>System Alarms</strong>
            <span>{unreadCount} new</span>
          </div>

          <div className="alarm-bell-list">
            {recentAlarms.map((alarm) => (
              <Link
                key={alarm.id}
                to="/system-alarms"
                className={`alarm-bell-item ${alarm.severity}`}
                onClick={() => setOpen(false)}
              >
                <span className="alarm-bell-item-icon">
                  <FontAwesomeIcon
                    icon={alarm.severity === 'critical' ? faTriangleExclamation : faBell}
                  />
                </span>
                <span>
                  <strong>{alarm.dam}</strong>
                  <em>{alarm.message}</em>
                  <small>{alarm.time}</small>
                </span>
              </Link>
            ))}
          </div>

          <Link to="/system-alarms" className="alarm-bell-view-all" onClick={() => setOpen(false)}>
            View all alarms
          </Link>
        </div>
      )}
    </div>
  )
}
