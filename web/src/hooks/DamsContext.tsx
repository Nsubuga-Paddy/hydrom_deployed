import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  fetchDams,
  mapDamToCascade,
  mapDamToGisMetrics,
  mapDamToRealtime,
  type DamApiItem,
} from '../api/dams'
import { ApiError } from '../api/client'
import type { CascadeDam, DamGis, DamRealtime } from '../data/dams'

export type DamsFetchStatus = 'loading' | 'ready' | 'error'

interface DamsContextValue {
  dams: CascadeDam[]
  realtimeDams: DamRealtime[]
  rawDams: DamApiItem[]
  status: DamsFetchStatus
  error: string | null
  defaultDamId: string | null
  getCascadeDam: (damId?: string | null) => CascadeDam | undefined
  getRealtimeDam: (damId?: string | null) => DamRealtime | undefined
  getGisDam: (damId?: string | null) => DamGis | undefined
  refresh: () => void
}

const DamsContext = createContext<DamsContextValue | null>(null)

const POLL_INTERVAL_MS = 60_000

export function DamsProvider({ children }: { children: ReactNode }) {
  const [rawDams, setRawDams] = useState<DamApiItem[]>([])
  const [status, setStatus] = useState<DamsFetchStatus>('loading')
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const load = useCallback(async (showLoading: boolean) => {
    if (showLoading) setStatus('loading')
    try {
      const items = await fetchDams()
      setRawDams(items)
      setStatus('ready')
      setError(null)
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Unable to load dams from the Hydro-M API.'
      setRawDams([])
      setStatus('error')
      setError(message)
    }
  }, [])

  useEffect(() => {
    void load(true)
    const intervalId = window.setInterval(() => {
      void load(false)
    }, POLL_INTERVAL_MS)
    return () => window.clearInterval(intervalId)
  }, [load, refreshKey])

  const dams = useMemo(
    () => rawDams.map((dam, index) => mapDamToCascade(dam, index)),
    [rawDams],
  )

  const realtimeDams = useMemo(() => rawDams.map(mapDamToRealtime), [rawDams])

  const value = useMemo<DamsContextValue>(
    () => ({
      dams,
      realtimeDams,
      rawDams,
      status,
      error,
      defaultDamId: dams[0]?.id ?? null,
      getCascadeDam: (damId) => dams.find((dam) => dam.id === damId),
      getRealtimeDam: (damId) => realtimeDams.find((dam) => dam.id === damId),
      getGisDam: (damId) => {
        const raw = rawDams.find((dam) => dam.id === damId)
        if (!raw) return undefined
        return {
          id: raw.id,
          name: raw.name,
          location: raw.location || undefined,
          latitude: raw.latitude ?? null,
          longitude: raw.longitude ?? null,
          metrics: mapDamToGisMetrics(raw),
        }
      },
      refresh: () => setRefreshKey((key) => key + 1),
    }),
    [dams, realtimeDams, rawDams, status, error],
  )

  return <DamsContext.Provider value={value}>{children}</DamsContext.Provider>
}

export function useDams() {
  const context = useContext(DamsContext)
  if (!context) {
    throw new Error('useDams must be used within DamsProvider')
  }
  return context
}
