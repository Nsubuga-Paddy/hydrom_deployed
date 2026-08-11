import { useEffect, useState } from 'react'
import { ApiError } from '../api/client'
import { fetchDamRealtime } from '../api/realtime'
import { createRealtimePlaceholder, type DamRealtime } from '../data/dams'
import { useDams } from './DamsContext'

const POLL_INTERVAL_MS = 20_000

export type RealtimeFetchStatus = 'loading' | 'live' | 'error'

export interface UseRealtimeDamResult {
  dam: DamRealtime
  status: RealtimeFetchStatus
  error: string | null
  timestamp: string | null
  refresh: () => void
}

export function useRealtimeDam(damId: string): UseRealtimeDamResult {
  const { getRealtimeDam } = useDams()
  const listDam = getRealtimeDam(damId)
  const fallback = listDam ?? createRealtimePlaceholder(damId)

  const [dam, setDam] = useState<DamRealtime>(fallback)
  const [status, setStatus] = useState<RealtimeFetchStatus>('loading')
  const [error, setError] = useState<string | null>(null)
  const [timestamp, setTimestamp] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    const nextFallback = getRealtimeDam(damId) ?? createRealtimePlaceholder(damId)

    setDam(nextFallback)
    setStatus('loading')
    setError(null)

    async function load() {
      try {
        const live = await fetchDamRealtime(damId)
        if (cancelled) return
        setDam(live)
        setStatus('live')
        setError(null)
        setTimestamp(new Date().toISOString())
      } catch (err) {
        if (cancelled) return
        const message =
          err instanceof ApiError
            ? err.status === 404
              ? `No live realtime data for ${nextFallback.name}.`
              : err.message
            : 'Unable to reach the Hydro-M API.'
        setDam(nextFallback)
        setStatus('error')
        setError(message)
      }
    }

    void load()
    const intervalId = window.setInterval(() => {
      void load()
    }, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [damId, refreshKey, getRealtimeDam])

  return {
    dam,
    status,
    error,
    timestamp,
    refresh: () => setRefreshKey((key) => key + 1),
  }
}
