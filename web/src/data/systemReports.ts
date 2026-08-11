export type SystemReportPeriod = 'weekly' | 'monthly'
export type SystemReportStatus = 'ready' | 'partial' | 'generating' | 'failed'

export interface SystemReportPreview {
  id: number | string
  title: string
  periodType: SystemReportPeriod
  periodStart: string
  periodEnd: string
  generatedAt: string | null
  status: SystemReportStatus
  completenessPercent: number
  damsCovered: number
  missingDataHighlights: string[]
  summary: string
  narrativeProvider?: string
  pdfUrl?: string | null
  downloadPath?: string | null
}

export function formatReportPeriod(start: string, end: string): string {
  const startDate = new Date(`${start}T00:00:00`)
  const endDate = new Date(`${end}T00:00:00`)
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
  return `${startDate.toLocaleDateString(undefined, options)} – ${endDate.toLocaleDateString(
    undefined,
    options,
  )}`
}

export function formatReportGeneratedAt(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
