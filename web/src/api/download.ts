import { API_BASE_URL, ApiError } from './client'

export type DownloadDataset = 'realtime' | 'predictions' | 'alarms' | 'gis'
export type DownloadResolution = 'raw' | 'hourly' | 'daily' | 'monthly'
export type DownloadFormat = 'csv' | 'xlsx' | 'pdf'

export interface DownloadAvailability {
  damId: string
  dataset: DownloadDataset
  earliestDate: string | null
  latestDate: string | null
  recordCount: number
  availableDays: number
  spanDays: number
  coverage: string
  availableWindows: Array<{ start: string; end: string }>
  unavailableDates: string[]
}

export interface DownloadExportParams {
  dam: string
  dataset: DownloadDataset
  start: string
  end: string
  format?: DownloadFormat
  resolution?: DownloadResolution
}

function buildQuery(params: Record<string, string>) {
  const query = new URLSearchParams(params)
  return query.toString()
}

export async function fetchDownloadAvailability(
  dam: string,
  dataset: DownloadDataset,
): Promise<DownloadAvailability> {
  const query = buildQuery({ dam, dataset })
  const response = await fetch(`${API_BASE_URL}/api/download-data/availability/?${query}`, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    let detail = `Request failed (${response.status})`
    try {
      const body = (await response.json()) as { error?: string; detail?: string }
      detail = body.error || body.detail || detail
    } catch {
      // ignore
    }
    throw new ApiError(detail, response.status)
  }

  return (await response.json()) as DownloadAvailability
}

export async function downloadExportFile(params: DownloadExportParams): Promise<void> {
  const query = buildQuery({
    dam: params.dam,
    dataset: params.dataset,
    start: params.start,
    end: params.end,
    format: params.format || 'csv',
    resolution: params.resolution || 'raw',
  })

  const response = await fetch(`${API_BASE_URL}/api/download-data/export/?${query}`, {
    credentials: 'include',
    headers: { Accept: 'text/csv, application/json' },
  })

  if (!response.ok) {
    let detail = `Export failed (${response.status})`
    try {
      const body = (await response.json()) as { error?: string; detail?: string }
      detail = body.error || body.detail || detail
    } catch {
      // ignore
    }
    throw new ApiError(detail, response.status)
  }

  const blob = await response.blob()
  const disposition = response.headers.get('Content-Disposition') || ''
  const match = disposition.match(/filename="?([^"]+)"?/i)
  const filename = match?.[1] || `${params.dataset}-export.csv`

  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export function formatAvailabilityWindow(window: { start: string; end: string }) {
  if (window.start === window.end) return window.start
  return `${window.start} — ${window.end}`
}
