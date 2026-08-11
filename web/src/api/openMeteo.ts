/** Free location weather from Open-Meteo (no API key). */

export interface OpenMeteoWeather {
  temperatureC: number | null
  humidityPercent: number | null
  precipitationMm: number | null
  windSpeedKmh: number | null
  updatedAt: string | null
  source: 'Open-Meteo'
}

function asFinite(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

export async function fetchOpenMeteoWeather(
  latitude: number,
  longitude: number,
): Promise<OpenMeteoWeather> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: 'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m',
    timezone: 'auto',
    wind_speed_unit: 'kmh',
  })

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`)
  if (!response.ok) {
    throw new Error(`Open-Meteo request failed (${response.status})`)
  }

  const data = (await response.json()) as {
    current?: {
      time?: string
      temperature_2m?: number
      relative_humidity_2m?: number
      precipitation?: number
      wind_speed_10m?: number
    }
  }
  const current = data.current || {}

  return {
    temperatureC: asFinite(current.temperature_2m),
    humidityPercent: asFinite(current.relative_humidity_2m),
    precipitationMm: asFinite(current.precipitation),
    windSpeedKmh: asFinite(current.wind_speed_10m),
    updatedAt: current.time || null,
    source: 'Open-Meteo',
  }
}

export function formatWeatherValue(
  value: number | null | undefined,
  unit: string,
  digits = 1,
): string {
  if (value == null || !Number.isFinite(value)) return '-'
  return `${value.toFixed(digits)}${unit}`
}

export function openStreetMapEmbedUrl(latitude: number, longitude: number, span = 0.08): string {
  const minLon = longitude - span
  const minLat = latitude - span
  const maxLon = longitude + span
  const maxLat = latitude + span
  return (
    `https://www.openstreetmap.org/export/embed.html?bbox=` +
    `${minLon}%2C${minLat}%2C${maxLon}%2C${maxLat}` +
    `&layer=mapnik&marker=${latitude}%2C${longitude}`
  )
}
