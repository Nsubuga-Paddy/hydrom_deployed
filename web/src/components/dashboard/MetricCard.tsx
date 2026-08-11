import { formatSensorValue, isUnavailableSensorValue } from '../../data/display'

interface MetricCardProps {
  value: string
  label: string
}

export function MetricCard({ value, label }: MetricCardProps) {
  const unavailable = isUnavailableSensorValue(value)

  return (
    <div className={`metric-card${unavailable ? ' metric-unavailable' : ''}`}>
      <div className="metric-value">{formatSensorValue(value)}</div>
      <div className="metric-separator" />
      <div className="metric-label">{label}</div>
    </div>
  )
}
