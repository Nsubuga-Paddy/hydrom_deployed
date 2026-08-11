import { useEffect, useMemo, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCalendarDays,
  faCircleCheck,
  faClock,
  faFilePdf,
  faFilter,
  faRobot,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons'
import { ApiError } from '../api/client'
import { fetchSystemReports, systemReportPdfUrl } from '../api/systemReports'
import {
  formatReportGeneratedAt,
  formatReportPeriod,
  type SystemReportPeriod,
  type SystemReportPreview,
} from '../data/systemReports'

type ReportFilter = 'all' | SystemReportPeriod

const filterLabels: Record<ReportFilter, string> = {
  all: 'All',
  weekly: 'Weekly',
  monthly: 'Monthly',
}

const statusLabels: Record<SystemReportPreview['status'], string> = {
  ready: 'Ready',
  partial: 'Partial data',
  generating: 'Generating',
  failed: 'Failed',
}

export function SystemGeneratedReportsPage() {
  const [filter, setFilter] = useState<ReportFilter>('all')
  const [reports, setReports] = useState<SystemReportPreview[]>([])
  const [weeklyCount, setWeeklyCount] = useState(0)
  const [monthlyCount, setMonthlyCount] = useState(0)
  const [selectedId, setSelectedId] = useState<string | number | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setStatus('loading')
      setError(null)
      try {
        const data = await fetchSystemReports(filter)
        if (cancelled) return
        setReports(data.reports)
        setWeeklyCount(data.weeklyCount)
        setMonthlyCount(data.monthlyCount)
        setSelectedId((current) => {
          if (current && data.reports.some((report) => report.id === current)) return current
          return data.reports[0]?.id ?? null
        })
        setStatus('ready')
      } catch (err) {
        if (cancelled) return
        setReports([])
        setStatus('error')
        setError(err instanceof ApiError ? err.message : 'Unable to load system reports.')
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [filter])

  const selected = useMemo(
    () => reports.find((report) => report.id === selectedId) ?? reports[0] ?? null,
    [reports, selectedId],
  )
  const latest = reports[0]

  function handleDownload(report: SystemReportPreview) {
    setSelectedId(report.id)
    const url = systemReportPdfUrl(report)
    if (!url) {
      setNotice('PDF is not available for this report yet.')
      return
    }
    setNotice(null)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="sgr-page">
      <section className="sgr-hero">
        <div>
          <p className="page-eyebrow">System Generated Reports</p>
          <h1>SGR archive</h1>
          <p>
            Automatic weekly and monthly cascade summaries with data-quality notes, published as PDF
            reports for operational review.
          </p>
        </div>
        <div className="sgr-hero-badge">
          <FontAwesomeIcon icon={faRobot} />
          <div>
            <span>Auto schedule</span>
            <strong>Weekly + Monthly</strong>
          </div>
        </div>
      </section>

      <section className="sgr-banner" role="status">
        <FontAwesomeIcon icon={faClock} />
        <p>
          Titles and KPI tables are system-generated from Hydro-M data. Executive summaries use a
          template baseline and may be polished by AI from those audited statistics only.
        </p>
      </section>

      <section className="sgr-summary-grid" aria-label="Report summary">
        <article className="sgr-summary-card">
          <span>Weekly reports</span>
          <strong>{weeklyCount}</strong>
        </article>
        <article className="sgr-summary-card">
          <span>Monthly reports</span>
          <strong>{monthlyCount}</strong>
        </article>
        <article className="sgr-summary-card accent">
          <span>Latest period</span>
          <strong>
            {latest ? formatReportPeriod(latest.periodStart, latest.periodEnd) : '—'}
          </strong>
        </article>
      </section>

      <section className="sgr-controls-card">
        <div>
          <FontAwesomeIcon icon={faFilter} />
          <span>Filter reports</span>
        </div>
        <div className="sgr-filter-tabs">
          {(Object.keys(filterLabels) as ReportFilter[]).map((item) => (
            <button
              key={item}
              type="button"
              className={filter === item ? 'active' : ''}
              onClick={() => {
                setFilter(item)
                setNotice(null)
              }}
            >
              {filterLabels[item]}
            </button>
          ))}
        </div>
      </section>

      {notice && (
        <div className="sgr-notice" role="status">
          <FontAwesomeIcon icon={faCircleCheck} />
          <p>{notice}</p>
        </div>
      )}

      {status === 'loading' && (
        <div className="sgr-empty">
          <p>Loading system reports…</p>
        </div>
      )}

      {status === 'error' && (
        <div className="sgr-empty">
          <p>{error || 'Unable to load system reports.'}</p>
        </div>
      )}

      {status === 'ready' && (
        <section className="sgr-layout">
          <div className="sgr-list" aria-label="Generated reports">
            {reports.length === 0 && (
              <div className="sgr-empty">
                <p>
                  No system reports yet. Generate them with{' '}
                  <code>python manage.py generate_system_reports --period backfill</code>.
                </p>
              </div>
            )}

            {reports.map((report) => (
              <article
                key={report.id}
                className={`sgr-report-card${selected?.id === report.id ? ' active' : ''}`}
              >
                <button
                  type="button"
                  className="sgr-report-select"
                  onClick={() => {
                    setSelectedId(report.id)
                    setNotice(null)
                  }}
                >
                  <div className="sgr-report-top">
                    <span className={`sgr-period-pill ${report.periodType}`}>
                      <FontAwesomeIcon icon={faCalendarDays} />
                      {report.periodType}
                    </span>
                    <span className={`sgr-status-pill ${report.status}`}>
                      {statusLabels[report.status]}
                    </span>
                  </div>
                  <h3>{report.title}</h3>
                  <p className="sgr-report-period">
                    {formatReportPeriod(report.periodStart, report.periodEnd)}
                  </p>
                  <div className="sgr-report-meta">
                    <span>Generated {formatReportGeneratedAt(report.generatedAt)}</span>
                    <span>{report.completenessPercent}% complete</span>
                    <span>{report.damsCovered} dams</span>
                  </div>
                </button>
                <button
                  type="button"
                  className="sgr-download-btn"
                  onClick={() => handleDownload(report)}
                  disabled={!report.downloadPath && !report.pdfUrl}
                >
                  <FontAwesomeIcon icon={faFilePdf} />
                  PDF
                </button>
              </article>
            ))}
          </div>

          <aside className="sgr-detail-panel" aria-label="Selected report details">
            {selected ? (
              <>
                <div className="sgr-detail-header">
                  <p className="page-eyebrow">Report preview</p>
                  <h2>{selected.title}</h2>
                  <p>{formatReportPeriod(selected.periodStart, selected.periodEnd)}</p>
                </div>

                <div className="sgr-detail-stats">
                  <div>
                    <span>Status</span>
                    <strong className={selected.status}>{statusLabels[selected.status]}</strong>
                  </div>
                  <div>
                    <span>Completeness</span>
                    <strong>{selected.completenessPercent}%</strong>
                  </div>
                  <div>
                    <span>Dams covered</span>
                    <strong>{selected.damsCovered}</strong>
                  </div>
                </div>

                <div className="sgr-detail-scroll">
                  <div className="sgr-detail-block">
                    <h3>Executive summary</h3>
                    <p>{selected.summary || 'Summary will appear once generation completes.'}</p>
                    {selected.narrativeProvider && (
                      <p className="sgr-provider-note">Source: {selected.narrativeProvider}</p>
                    )}
                  </div>

                  <div className="sgr-detail-block">
                    <h3>
                      <FontAwesomeIcon icon={faTriangleExclamation} />
                      Missing data & quality notes
                    </h3>
                    {selected.missingDataHighlights?.length ? (
                      <ul>
                        {selected.missingDataHighlights.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>No major data-quality issues flagged.</p>
                    )}
                  </div>

                  <div className="sgr-detail-block muted">
                    <h3>PDF contents</h3>
                    <ol>
                      <li>Cover page with period and cascade overview</li>
                      <li>Executive summary</li>
                      <li>Per-dam reservoir KPI table</li>
                      <li>Missing-data and sensor-status section</li>
                      <li>Generation notes</li>
                    </ol>
                  </div>
                </div>

                <div className="sgr-detail-actions">
                  <button
                    type="button"
                    className="sgr-download-btn primary"
                    onClick={() => handleDownload(selected)}
                    disabled={!selected.downloadPath && !selected.pdfUrl}
                  >
                    <FontAwesomeIcon icon={faFilePdf} />
                    Download PDF
                  </button>
                </div>
              </>
            ) : (
              <div className="sgr-empty">
                <p>Select a report to preview its summary and data-quality notes.</p>
              </div>
            )}
          </aside>
        </section>
      )}
    </div>
  )
}
