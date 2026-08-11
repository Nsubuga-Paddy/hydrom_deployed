import type { CascadeDam, DamMetrics, DamRealtime, GisMetrics } from '../data/dams'
import { formatSensorValue } from '../data/display'
import { apiGet } from './client'

export interface DamApiItem {
  id: string
  databaseId: number
  name: string
  location: string
  order: number
  latitude?: number | null
  longitude?: number | null
  timestamp: string | null
  reservoirWaterLevel: string | null
  headRaceWaterLevel: string | null
  tailRaceWaterLevel: string | null
  dispatch: string | null
  discharge: string | null
  metrics: {
    reservoirWaterLevel: string | null
    headRaceWaterLevel: string | null
    tailRaceWaterLevel: string | null
    dispatch: string | null
    discharge: string | null
    humidity: string | null
    temperature: string | null
    precipitation: string | null
  }
}

function parseChartBaseLevel(level: string | null | undefined): number {
  if (!level) return 0
  const match = level.match(/-?\d+(\.\d+)?/)
  if (!match) return 0
  const value = Number.parseFloat(match[0])
  return Number.isFinite(value) ? Math.floor(value) : 0
}

export function mapDamMetrics(metrics: DamApiItem['metrics']): DamMetrics {
  return {
    reservoirWaterLevel: formatSensorValue(metrics.reservoirWaterLevel),
    headRaceWaterLevel: metrics.headRaceWaterLevel,
    tailRaceWaterLevel: metrics.tailRaceWaterLevel,
    dispatch: formatSensorValue(metrics.dispatch),
    discharge: formatSensorValue(metrics.discharge),
    humidity: formatSensorValue(metrics.humidity),
    temperature: formatSensorValue(metrics.temperature),
    precipitation: formatSensorValue(metrics.precipitation),
  }
}

export function mapDamToCascade(dam: DamApiItem, index: number): CascadeDam {
  return {
    id: dam.id,
    name: dam.name,
    location: dam.location || undefined,
    latitude: dam.latitude ?? null,
    longitude: dam.longitude ?? null,
    reservoirWaterLevel: formatSensorValue(
      dam.reservoirWaterLevel ?? dam.metrics.reservoirWaterLevel,
    ),
    headRaceWaterLevel: dam.headRaceWaterLevel ?? dam.metrics.headRaceWaterLevel,
    tailRaceWaterLevel: dam.tailRaceWaterLevel ?? dam.metrics.tailRaceWaterLevel,
    dispatch: formatSensorValue(dam.dispatch ?? dam.metrics.dispatch),
    discharge: formatSensorValue(dam.discharge ?? dam.metrics.discharge),
    featured: index === 0,
  }
}

export function mapDamToRealtime(dam: DamApiItem): DamRealtime {
  const metrics = mapDamMetrics(dam.metrics)
  return {
    id: dam.id,
    name: dam.name,
    location: dam.location || undefined,
    timestamp: dam.timestamp,
    chartBaseLevel: parseChartBaseLevel(dam.metrics.reservoirWaterLevel),
    metrics,
  }
}

export function mapDamToGisMetrics(dam: DamApiItem): GisMetrics {
  return {
    reservoirWaterLevel: formatSensorValue(dam.metrics.reservoirWaterLevel),
    headRaceWaterLevel: dam.metrics.headRaceWaterLevel,
    tailRaceWaterLevel: dam.metrics.tailRaceWaterLevel,
    // Weather cards are filled live from Open-Meteo on the GIS panel.
    precipitation: '-',
    humidity: '-',
    temperature: '-',
    windSpeed: '-',
    latitude: dam.latitude ?? null,
    longitude: dam.longitude ?? null,
    weatherSource: 'Open-Meteo',
  }
}

export async function fetchDams(): Promise<DamApiItem[]> {
  return apiGet<DamApiItem[]>('/api/dams/')
}
