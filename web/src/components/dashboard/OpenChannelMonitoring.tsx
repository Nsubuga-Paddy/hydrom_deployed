import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLocationDot, faWater } from '@fortawesome/free-solid-svg-icons'
import type { ChannelStation } from '../../data/dams'
import { MetricCard } from './MetricCard'

interface OpenChannelMonitoringProps {
  station: ChannelStation
}

export function OpenChannelMonitoring({ station }: OpenChannelMonitoringProps) {
  return (
    <div className="open-channel-card">
      <div className="open-channel-header">
        <div className="open-channel-title-block">
          <span className="open-channel-icon" aria-hidden="true">
            <FontAwesomeIcon icon={faWater} />
          </span>
          <div>
            <p className="page-eyebrow">Real-time sensor</p>
            <h3>Open-channel monitoring</h3>
            <p className="open-channel-subtitle">
              Open-channel water level, velocity, and flow measured downstream of the dam tail race.
            </p>
          </div>
        </div>
      </div>

      <div className="open-channel-location">
        <FontAwesomeIcon icon={faLocationDot} />
        <div>
          <strong>{station.name}</strong>
          <span>{station.location}</span>
          <span className="open-channel-distance">{station.distanceFromTailRace}</span>
        </div>
      </div>

      <div className="dam-metrics-grid cols-3 open-channel-metrics">
        <MetricCard value={station.metrics.stage} label="Open-channel water level" />
        <MetricCard value={station.metrics.velocity} label="Velocity" />
        <MetricCard value={station.metrics.flow} label="Flow (tail-race discharge)" />
      </div>
    </div>
  )
}
