import { useEffect, useState } from 'react'
import { fetchOpenMeteoWeather, type OpenMeteoWeather } from '../api/openMeteo'

export type OpenMeteoStatus = 'idle' | 'loading' | 'ready' | 'error'

interface UseOpenMeteoResult {
  weather: OpenMeteoWeather | null
  status: OpenMeteoStatus
  error: string | null
  refresh: () => void
}

export function useOpenMeteo(
  latitude?: number | null,
  longitude?: number | null,
): UseOpenMeteoResult {
  const [weather, setWeather] = useState<OpenMeteoWeather | null>(null)
  const [status, setStatus] = useState<OpenMeteoStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (
      latitude == null ||
      longitude == null ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      setWeather(null)
      setStatus('idle')
      setError(null)
      return
    }

    const lat = latitude
    const lon = longitude
    let cancelled = false

    async function load() {
      setStatus('loading')
      setError(null)
      try {
        const data = await fetchOpenMeteoWeather(lat, lon)
        if (cancelled) return
        setWeather(data)
        setStatus('ready')
      } catch (err) {
        if (cancelled) return
        setWeather(null)
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Unable to load Open-Meteo weather.')
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [latitude, longitude, refreshKey])

  return {
    weather,
    status,
    error,
    refresh: () => setRefreshKey((value) => value + 1),
  }
}
