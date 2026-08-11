/** Shown when a dam exists but a sensor reading is not yet available. */
export const NO_DATA_AVAILABLE = '-'

export function formatSensorValue(value: string | null | undefined): string {
  if (value == null) return NO_DATA_AVAILABLE
  const trimmed = value.trim()
  if (
    !trimmed ||
    trimmed === '-' ||
    trimmed === '—' ||
    trimmed.toLowerCase() === 'no data available'
  ) {
    return NO_DATA_AVAILABLE
  }
  return trimmed
}

export function isUnavailableSensorValue(value: string | null | undefined): boolean {
  if (value == null) return true
  const trimmed = value.trim()
  return (
    !trimmed ||
    trimmed === '-' ||
    trimmed === '—' ||
    trimmed.toLowerCase() === 'no data available'
  )
}
