import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBell,
  faCalendarDays,
  faChartLine,
  faDatabase,
  faDownload,
  faFileCsv,
  faMapLocationDot,
  faRobot,
  faWater,
} from '@fortawesome/free-solid-svg-icons'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  downloadExportFile,
  fetchDownloadAvailability,
  formatAvailabilityWindow,
  type DownloadAvailability,
  type DownloadDataset,
  type DownloadFormat,
  type DownloadResolution,
} from '../api/download'
import { ApiError } from '../api/client'
import { useDams } from '../hooks/DamsContext'

const datasetOptions = [
  {
    id: 'realtime' as const,
    icon: faWater,
    title: 'Realtime readings',
    text: 'Reservoir water level, humidity, temperature, and precipitation from installed sensors.',
  },
  {
    id: 'predictions' as const,
    icon: faChartLine,
    title: 'Prediction reports',
    text: 'Stored water-level prediction values for selected dams and date ranges.',
  },
  {
    id: 'alarms' as const,
    icon: faBell,
    title: 'Alarm history',
    text: 'Alarm export will be enabled once alarm records are available through the API.',
  },
  {
    id: 'gis' as const,
    icon: faMapLocationDot,
    title: 'GIS summaries',
    text: 'Stored GIS/remote weather summaries (Open-Meteo-backed once the backend pipeline is connected).',
  },
] as const

export function DownloadDataPage() {
  const { dams, status: damsStatus } = useDams()
  const [dam, setDam] = useState('all')
  const [dataset, setDataset] = useState<DownloadDataset>('realtime')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [resolution, setResolution] = useState<DownloadResolution>('raw')
  const [format, setFormat] = useState<DownloadFormat>('csv')
  const [availability, setAvailability] = useState<DownloadAvailability | null>(null)
  const [availabilityStatus, setAvailabilityStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)
  const [exportStatus, setExportStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle')
  const [exportMessage, setExportMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadAvailability() {
      setAvailabilityStatus('loading')
      setAvailabilityError(null)
      try {
        const data = await fetchDownloadAvailability(dam, dataset)
        if (cancelled) return
        setAvailability(data)
        setAvailabilityStatus('ready')
        if (data.earliestDate && data.latestDate) {
          setStartDate(data.earliestDate)
          setEndDate(data.latestDate)
        } else {
          setStartDate('')
          setEndDate('')
        }
      } catch (err) {
        if (cancelled) return
        setAvailability(null)
        setAvailabilityStatus('error')
        setAvailabilityError(
          err instanceof ApiError ? err.message : 'Unable to load data availability.',
        )
      }
    }

    void loadAvailability()
    return () => {
      cancelled = true
    }
  }, [dam, dataset])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setExportStatus('loading')
    setExportMessage(null)

    if (!startDate || !endDate) {
      setExportStatus('error')
      setExportMessage('Select a start and end date within the available range.')
      return
    }

    if (format !== 'csv') {
      setExportStatus('error')
      setExportMessage('Only CSV export is supported at the moment.')
      return
    }

    try {
      await downloadExportFile({
        dam,
        dataset,
        start: startDate,
        end: endDate,
        format,
        resolution: dataset === 'realtime' ? resolution : 'raw',
      })
      setExportStatus('success')
      setExportMessage('Download started.')
    } catch (err) {
      setExportStatus('error')
      setExportMessage(err instanceof ApiError ? err.message : 'Unable to generate download.')
    }
  }

  const canExport =
    availabilityStatus === 'ready' &&
    Boolean(availability?.earliestDate && availability.latestDate && startDate && endDate) &&
    dataset !== 'alarms' &&
    format === 'csv'

  return (
    <div className="download-page">
      <section className="download-hero">
        <div>
          <p className="page-eyebrow">Download Data</p>
          <h1>Export Hydro-M operational data</h1>
          <p>Select the dam, dataset, period, and file format before generating a download.</p>
        </div>
        <div className="download-hero-card">
          <FontAwesomeIcon icon={faDatabase} />
          <span>Export center</span>
          <strong>Internal data access</strong>
        </div>
      </section>

      <section className="download-dataset-grid" aria-label="Available datasets">
        {datasetOptions.map((option) => (
          <article
            key={option.title}
            className={`download-dataset-card${dataset === option.id ? ' selected' : ''}`}
          >
            <button type="button" onClick={() => setDataset(option.id)}>
              <span>
                <FontAwesomeIcon icon={option.icon} />
              </span>
              <h2>{option.title}</h2>
              <p>{option.text}</p>
            </button>
          </article>
        ))}
      </section>

      <section className="download-assistant-card">
        <span>
          <FontAwesomeIcon icon={faRobot} />
        </span>
        <div>
          <h2>Use Hydro-M Assistant for reports and quick insights</h2>
          <p>
            Ask the Hydro-M Assistant to generate reports, summarise alarm trends, compare dam
            readings, or surface quick operational insights before downloading raw data.
          </p>
        </div>
      </section>

      <section className="download-workspace">
        <form className="download-form" onSubmit={handleSubmit}>
          <div className="download-form-header">
            <div>
              <p className="page-eyebrow">Export request</p>
              <h2>Configure download</h2>
            </div>
            <span>
              <FontAwesomeIcon icon={faFileCsv} />
              CSV from database
            </span>
          </div>

          <div className="download-form-grid">
            <label>
              Dam / station
              <select
                name="dam"
                value={dam}
                onChange={(event) => setDam(event.target.value)}
                disabled={damsStatus === 'loading'}
              >
                <option value="all">All cascade dams</option>
                {dams.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Dataset
              <select
                name="dataset"
                value={dataset}
                onChange={(event) => setDataset(event.target.value as DownloadDataset)}
              >
                <option value="realtime">Realtime readings</option>
                <option value="predictions">Prediction reports</option>
                <option value="alarms">Alarm history</option>
                <option value="gis">GIS summaries</option>
              </select>
            </label>
            <label>
              Start date
              <input
                type="date"
                name="startDate"
                value={startDate}
                min={availability?.earliestDate || undefined}
                max={availability?.latestDate || undefined}
                onChange={(event) => setStartDate(event.target.value)}
                disabled={!availability?.earliestDate}
              />
            </label>
            <label>
              End date
              <input
                type="date"
                name="endDate"
                value={endDate}
                min={availability?.earliestDate || undefined}
                max={availability?.latestDate || undefined}
                onChange={(event) => setEndDate(event.target.value)}
                disabled={!availability?.latestDate}
              />
            </label>
            <label>
              Time resolution
              <select
                name="resolution"
                value={resolution}
                onChange={(event) => setResolution(event.target.value as DownloadResolution)}
                disabled={dataset !== 'realtime'}
              >
                <option value="raw">Raw readings</option>
                <option value="hourly">Hourly summary</option>
                <option value="daily">Daily summary</option>
                <option value="monthly">Monthly summary</option>
              </select>
            </label>
            <label>
              File format
              <select
                name="format"
                value={format}
                onChange={(event) => setFormat(event.target.value as DownloadFormat)}
              >
                <option value="csv">CSV</option>
                <option value="xlsx">XLSX (coming soon)</option>
                <option value="pdf">PDF report (coming soon)</option>
              </select>
            </label>
          </div>

          <section className="download-availability-card" aria-label="Data availability">
            <div className="download-availability-header">
              <div>
                <p className="page-eyebrow">Data availability</p>
                <h3>Available date range</h3>
              </div>
              <strong>
                {availabilityStatus === 'loading'
                  ? 'Loading…'
                  : availability?.coverage || 'No data available'}
              </strong>
            </div>

            {availabilityStatus === 'error' && (
              <p className="download-availability-note error">{availabilityError}</p>
            )}

            {availabilityStatus === 'ready' && availability && (
              <>
                <div className="download-availability-summary">
                  <span>Earliest: {availability.earliestDate || '-'}</span>
                  <span>Latest: {availability.latestDate || '-'}</span>
                  <span>Records: {availability.recordCount}</span>
                </div>

                {availability.availableWindows.length > 0 && (
                  <div className="download-availability-windows">
                    {availability.availableWindows.slice(0, 8).map((window) => (
                      <span key={`${window.start}-${window.end}`}>
                        {formatAvailabilityWindow(window)}
                      </span>
                    ))}
                  </div>
                )}

                <p className="download-availability-note">
                  {availability.unavailableDates.length > 0
                    ? `Unavailable days in range: ${availability.unavailableDates.slice(0, 12).join(', ')}${
                        availability.unavailableDates.length > 12 ? '…' : ''
                      }`
                    : availability.earliestDate
                      ? 'No gaps detected between the earliest and latest available dates.'
                      : 'No stored records were found for this dam and dataset.'}
                </p>
              </>
            )}
          </section>

          <div className="download-form-footer">
            <p>
              <FontAwesomeIcon icon={faCalendarDays} />
              Exports should be used for internal UEGCL operational review and reporting.
            </p>
            <div className="download-form-actions">
              {exportMessage && (
                <span className={`download-export-message ${exportStatus}`}>{exportMessage}</span>
              )}
              <button type="submit" disabled={!canExport || exportStatus === 'loading'}>
                <FontAwesomeIcon icon={faDownload} />
                {exportStatus === 'loading' ? 'Generating…' : 'Generate download'}
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  )
}
