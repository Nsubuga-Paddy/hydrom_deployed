import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBell,
  faCircleCheck,
  faClock,
  faFilter,
  faTriangleExclamation,
  faWater,
} from '@fortawesome/free-solid-svg-icons'
import type { AlarmPreview } from '../data/dams'
import { damPath } from '../data/dams'
import { getSystemAlarms } from '../data/alarms'

type AlarmFilter = 'all' | AlarmPreview['severity']

const severityLabels: Record<AlarmFilter, string> = {
  all: 'All',
  critical: 'Critical',
  warning: 'Warning',
  info: 'Info',
}

const severityIcons: Record<AlarmPreview['severity'], typeof faBell> = {
  critical: faTriangleExclamation,
  warning: faBell,
  info: faCircleCheck,
}

export function SystemAlarmsPage() {
  const [filter, setFilter] = useState<AlarmFilter>('all')
  const alarms = useMemo(() => getSystemAlarms(), [])
  const filteredAlarms = alarms.filter((alarm) => filter === 'all' || alarm.severity === filter)
  const criticalCount = alarms.filter((alarm) => alarm.severity === 'critical').length
  const warningCount = alarms.filter((alarm) => alarm.severity === 'warning').length
  const infoCount = alarms.filter((alarm) => alarm.severity === 'info').length

  return (
    <div className="system-alarms-page">
      <section className="alarms-hero">
        <div>
          <p className="page-eyebrow">Operations center</p>
          <h1>System Alarms</h1>
          <p>Monitor active alerts, operating thresholds, and dam-specific risk signals.</p>
        </div>
        <div className="alarms-live-indicator">
          <span className="live-status-dot compact" />
          Live alarm feed
        </div>
      </section>

      <section className="alarm-summary-grid" aria-label="Alarm summary">
        <article className="alarm-summary-card critical">
          <span>Critical</span>
          <strong>{criticalCount}</strong>
        </article>
        <article className="alarm-summary-card warning">
          <span>Warnings</span>
          <strong>{warningCount}</strong>
        </article>
        <article className="alarm-summary-card info">
          <span>Info</span>
          <strong>{infoCount}</strong>
        </article>
      </section>

      <section className="alarm-controls-card">
        <div>
          <FontAwesomeIcon icon={faFilter} />
          <span>Filter alarms</span>
        </div>
        <div className="alarm-filter-tabs">
          {(Object.keys(severityLabels) as AlarmFilter[]).map((item) => (
            <button
              key={item}
              type="button"
              className={filter === item ? 'active' : ''}
              onClick={() => setFilter(item)}
            >
              {severityLabels[item]}
            </button>
          ))}
        </div>
      </section>

      <section className="alarm-list-section">
        <div className="alarm-section-header">
          <div>
            <h2>Alarm Queue</h2>
            <p>
              {filteredAlarms.length} alarm{filteredAlarms.length === 1 ? '' : 's'} displayed
            </p>
          </div>
          <span>Latest first</span>
        </div>

        <div className="system-alarm-list">
          {filteredAlarms.map((alarm) => (
            <article key={alarm.id} className={`system-alarm-card ${alarm.severity}`}>
              <div className="system-alarm-icon">
                <FontAwesomeIcon icon={severityIcons[alarm.severity]} />
              </div>

              <div className="system-alarm-body">
                <div className="system-alarm-title-row">
                  <div>
                    <span className={`alarm-severity-pill ${alarm.severity}`}>
                      {alarm.severity}
                    </span>
                    <h3>{alarm.dam}</h3>
                  </div>
                  <span className={`alarm-status-pill ${alarm.status}`}>{alarm.status}</span>
                </div>

                <p>{alarm.message}</p>

                <div className="alarm-detail-grid">
                  <div>
                    <span>Source</span>
                    <strong>{alarm.source}</strong>
                  </div>
                  <div>
                    <span>Parameter</span>
                    <strong>{alarm.parameter}</strong>
                  </div>
                  <div>
                    <span>Threshold</span>
                    <strong>{alarm.threshold}</strong>
                  </div>
                  <div>
                    <span>Current</span>
                    <strong>{alarm.currentValue}</strong>
                  </div>
                </div>

                <div className="alarm-action-row">
                  <div>
                    <FontAwesomeIcon icon={faClock} />
                    <span>{alarm.time}</span>
                  </div>
                  <div>
                    <FontAwesomeIcon icon={faWater} />
                    <span>{alarm.action}</span>
                  </div>
                  <Link to={damPath(alarm.damId, 'realtime')}>View dam</Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
