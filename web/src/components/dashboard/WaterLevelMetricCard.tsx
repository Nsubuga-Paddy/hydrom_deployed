import { formatSensorValue, isUnavailableSensorValue } from '../../data/display'

interface WaterLevelMetricCardProps {
  reservoir: string | null
  headRace: string | null
  tailRace: string | null
  label?: string
}

export function WaterLevelMetricCard({
  reservoir,
  headRace,
  tailRace,
  label = 'Water level',
}: WaterLevelMetricCardProps) {
  const reservoirDisplay = formatSensorValue(reservoir)
  const headDisplay = formatSensorValue(headRace)
  const tailDisplay = formatSensorValue(tailRace)
  const unavailable =
    isUnavailableSensorValue(reservoir) &&
    isUnavailableSensorValue(headRace) &&
    isUnavailableSensorValue(tailRace)

  return (
    <div
      className={`metric-card water-level-metric-card${unavailable ? ' metric-unavailable' : ''}`}
    >
      <div className="water-level-pair">
        <div
          className={`water-level-reading${isUnavailableSensorValue(reservoir) ? ' unavailable' : ''}`}
        >
          <span>Reservoir</span>
          <strong>{reservoirDisplay}</strong>
        </div>
        <div
          className={`water-level-reading${isUnavailableSensorValue(headRace) ? ' unavailable' : ''}`}
        >
          <span>Head race</span>
          <strong>{headDisplay}</strong>
        </div>
        <div
          className={`water-level-reading${isUnavailableSensorValue(tailRace) ? ' unavailable' : ''}`}
        >
          <span>Tail race</span>
          <strong>{tailDisplay}</strong>
        </div>
      </div>
      <div className="metric-separator" />
      <div className="metric-label">{label}</div>
    </div>
  )
}
