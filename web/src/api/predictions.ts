import { apiGet, apiPost } from './client'

export interface PredictionPoint {
  timestamp: string
  value: number
  hourOffset?: number
}

export interface DamPredictionResponse {
  id: string
  databaseId: number
  name: string
  status: 'ready' | 'unavailable' | 'error' | string
  unit: string
  horizonHours: number
  generatedAt: string | null
  currentObserved: number | null
  finalForecast: number | null
  expectedChange: number | null
  observed: PredictionPoint[]
  forecast: PredictionPoint[]
  inputs: {
    precipitation: number
    humidity: number
    temperature: number
  } | null
  error: string | null
  model: {
    type: string
    stepsIn: number
    stepsOut: number
    features: string[]
    target: string
  }
}

export async function fetchDamPredictions(
  damId: string,
  options?: { refresh?: boolean },
): Promise<DamPredictionResponse> {
  const query = options?.refresh ? '?refresh=1' : ''
  return apiGet<DamPredictionResponse>(
    `/api/dams/${encodeURIComponent(damId)}/predictions/${query}`,
  )
}

export async function runDamPredictions(damId: string): Promise<DamPredictionResponse> {
  return apiPost<DamPredictionResponse>(
    `/api/dams/${encodeURIComponent(damId)}/predictions/run/`,
    {},
  )
}
