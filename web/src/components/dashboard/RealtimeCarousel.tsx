import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { formatSensorValue, isUnavailableSensorValue } from '../../data/display'
import { useCarousel } from '../../hooks/useCarousel'
import { useClock } from '../../hooks/useClock'
import { useDams } from '../../hooks/DamsContext'

const SECONDARY_METRICS = [
  { key: 'dispatch', label: 'Dispatch' },
  { key: 'discharge', label: 'Discharge' },
  { key: 'humidity', label: 'Humidity' },
  { key: 'temperature', label: 'Temperature' },
  { key: 'precipitation', label: 'Precipitation' },
] as const

function formatUpdatedAt(timestamp?: string | null): string | null {
  if (!timestamp) return null
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function RealtimeCarousel() {
  const clock = useClock()
  const { realtimeDams, status, error, refresh } = useDams()
  const { index, next, prev, goTo } = useCarousel(realtimeDams.length, 15000)
  const activeDam = realtimeDams[index]
  const updatedAt = formatUpdatedAt(activeDam?.timestamp)

  return (
    <section className="panel-card realtime-card">
      <div className="panel-card-left">
        <div className="monitoring-header">
          <h3>Real-time monitoring</h3>
          <div className="white-line" />
          <div className="datetime-display">
            <div className="date-info">
              {clock.day}, {clock.month} {clock.date}, {clock.year}
            </div>
            <div className="time-info">{clock.time}</div>
          </div>
        </div>
      </div>

      <div className="panel-card-right">
        {status === 'loading' && realtimeDams.length === 0 && (
          <p className="dam-list-status">Loading live dams…</p>
        )}
        {status === 'error' && realtimeDams.length === 0 && (
          <div className="dam-list-status error">
            <p>{error || 'Unable to load dams.'}</p>
            <button type="button" onClick={refresh}>
              Retry
            </button>
          </div>
        )}

        {activeDam && (
          <div className="dam-data-section realtime-hero-section">
            <div className="realtime-hero-toolbar">
              <div className="realtime-dam-tabs" role="tablist" aria-label="Select dam">
                {realtimeDams.map((dam, damIndex) => (
                  <button
                    key={dam.id}
                    type="button"
                    role="tab"
                    aria-selected={damIndex === index}
                    className={`realtime-dam-tab${damIndex === index ? ' active' : ''}`}
                    onClick={() => goTo(damIndex)}
                  >
                    {dam.name}
                  </button>
                ))}
              </div>
              <div className="realtime-live-meta">
                <span className="realtime-live-pill">
                  <span className="realtime-live-dot" aria-hidden="true" />
                  Live
                </span>
                {updatedAt && <span className="realtime-updated">Updated {updatedAt}</span>}
              </div>
            </div>

            <div className="realtime-hero-body">
              <div className="realtime-hero-primary">
                <p className="realtime-hero-label">Reservoir</p>
                <p
                  className={`realtime-hero-value${
                    isUnavailableSensorValue(activeDam.metrics.reservoirWaterLevel)
                      ? ' unavailable'
                      : ''
                  }`}
                >
                  {formatSensorValue(activeDam.metrics.reservoirWaterLevel)}
                </p>
                <div className="realtime-hero-rail" aria-hidden="true">
                  <span />
                </div>
                <div className="realtime-hero-race-list">
                  <div
                    className={`realtime-hero-tail${
                      isUnavailableSensorValue(activeDam.metrics.headRaceWaterLevel)
                        ? ' unavailable'
                        : ''
                    }`}
                  >
                    <span>Head race</span>
                    <strong>{formatSensorValue(activeDam.metrics.headRaceWaterLevel)}</strong>
                  </div>
                  <div
                    className={`realtime-hero-tail${
                      isUnavailableSensorValue(activeDam.metrics.tailRaceWaterLevel)
                        ? ' unavailable'
                        : ''
                    }`}
                  >
                    <span>Tail race</span>
                    <strong>{formatSensorValue(activeDam.metrics.tailRaceWaterLevel)}</strong>
                  </div>
                </div>
                {activeDam.location && (
                  <p className="realtime-hero-location">{activeDam.location}</p>
                )}
              </div>

              <div className="realtime-secondary-strip" aria-label="Secondary readings">
                {SECONDARY_METRICS.map((metric) => {
                  const value = activeDam.metrics[metric.key]
                  const unavailable = isUnavailableSensorValue(value)
                  return (
                    <div
                      key={metric.key}
                      className={`realtime-secondary-item${unavailable ? ' unavailable' : ''}`}
                    >
                      <span className="realtime-secondary-label">{metric.label}</span>
                      <strong className="realtime-secondary-value">
                        {formatSensorValue(value)}
                      </strong>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="carousel-nav real-time-nav">
              {realtimeDams.map((dam, damIndex) => (
                <button
                  key={dam.id}
                  type="button"
                  className={`nav-dot${damIndex === index ? ' active' : ''}`}
                  aria-label={`Go to ${dam.name}`}
                  onClick={() => goTo(damIndex)}
                />
              ))}
            </div>

            <div className="carousel-controls real-time-controls">
              <button
                type="button"
                className="carousel-btn prev-btn"
                onClick={prev}
                aria-label="Previous dam"
              >
                <FontAwesomeIcon icon={faChevronLeft} />
              </button>
              <button
                type="button"
                className="carousel-btn next-btn"
                onClick={next}
                aria-label="Next dam"
              >
                <FontAwesomeIcon icon={faChevronRight} />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
