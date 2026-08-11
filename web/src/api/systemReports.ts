import { apiGet, API_BASE_URL } from './client'
import type { SystemReportPeriod, SystemReportPreview } from '../data/systemReports'

export interface SystemReportsResponse {
  count: number
  weeklyCount: number
  monthlyCount: number
  reports: SystemReportPreview[]
}

export async function fetchSystemReports(
  period: 'all' | SystemReportPeriod = 'all',
): Promise<SystemReportsResponse> {
  const query = period === 'all' ? '' : `?period=${encodeURIComponent(period)}`
  return apiGet<SystemReportsResponse>(`/api/system-reports/${query}`)
}

export function systemReportPdfUrl(report: SystemReportPreview): string | null {
  if (report.downloadPath) {
    return `${API_BASE_URL}${report.downloadPath}`
  }
  return report.pdfUrl || null
}
