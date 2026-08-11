import type { DamMetrics, DamRealtime } from '../data/dams'
import { createRealtimePlaceholder } from '../data/dams'
import { apiGet } from './client'
import { mapDamMetrics, type DamApiItem } from './dams'

export type RealtimeApiResponse = DamApiItem

function parseChartBaseLevel(level: string | null, fallback: number): number {
  if (!level) return fallback
  const match = level.match(/-?\d+(\.\d+)?/)
  if (!match) return fallback
  const value = Number.parseFloat(match[0])
  return Number.isFinite(value) ? Math.floor(value) : fallback
}

export function mapRealtimeResponse(data: RealtimeApiResponse, fallback?: DamRealtime): DamRealtime {
  const base = fallback ?? createRealtimePlaceholder(data.id, data.name)
  const metrics: DamMetrics = mapDamMetrics(data.metrics)

  return {
    id: data.id || base.id,
    name: data.name || base.name,
    location: data.location || base.location,
    timestamp: data.timestamp ?? base.timestamp ?? null,
    chartBaseLevel: parseChartBaseLevel(data.metrics.reservoirWaterLevel, base.chartBaseLevel),
    metrics,
  }
}

export async function fetchDamRealtime(damId: string): Promise<DamRealtime> {
  const data = await apiGet<RealtimeApiResponse>(`/api/dams/${encodeURIComponent(damId)}/realtime/`)
  return mapRealtimeResponse(data, createRealtimePlaceholder(damId, data.name))
}

export type RealtimeHistoryRange = '1h' | '6h' | '24h' | '7d'

export interface RealtimeHistoryResponse {
  id: string
  databaseId: number
  range: RealtimeHistoryRange
  labels: string[]
  reservoirWaterLevels: Array<number | null>
  headRaceWaterLevels: Array<number | null>
  tailRaceWaterLevels: Array<number | null>
  dispatches: Array<number | null>
  discharges: Array<number | null>
  humidity: Array<number | null>
  temperature: Array<number | null>
  precipitation: Array<number | null>
}

export async function fetchDamRealtimeHistory(
  damId: string,
  range: RealtimeHistoryRange = '24h',
): Promise<RealtimeHistoryResponse> {
  return apiGet<RealtimeHistoryResponse>(
    `/api/dams/${encodeURIComponent(damId)}/realtime/history/?range=${encodeURIComponent(range)}`,
  )
}

export function hasNumericSeries(values: Array<number | null> | undefined): boolean {
  return Boolean(values?.some((value) => value != null && Number.isFinite(value)))
}

