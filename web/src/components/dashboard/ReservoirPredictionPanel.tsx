import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRotateRight } from '@fortawesome/free-solid-svg-icons'
import type { DamRealtime } from '../../data/dams'
import { ApiError } from '../../api/client'
import {
  fetchDamPredictions,
  type DamPredictionResponse,
} from '../../api/predictions'
import { useTheme } from '../../hooks/ThemeContext'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
)

function formatClock(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

interface ReservoirPredictionPanelProps {
  dam: DamRealtime
}

export function ReservoirPredictionPanel({ dam }: ReservoirPredictionPanelProps) {
  const { theme } = useTheme()
  const [data, setData] = useState<DamPredictionResponse | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const chartText = theme === 'dark' ? '#cbd5e1' : '#666666'
  const chartGrid =
    theme === 'dark' ? 'rgba(148, 163, 184, 0.18)' : 'rgba(0, 0, 0, 0.08)'
  const chartFontFamily =
    "'Century Gothic', CenturyGothic, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"

  const load = useCallback(
    async (refresh = false) => {
      setError(null)
      if (refresh) setRefreshing(true)
      else setStatus('loading')
      try {
        const payload = await fetchDamPredictions(dam.id, { refresh })
        setData(payload)
        if (payload.status === 'error' && !payload.forecast.length) {
          setStatus('error')
          setError(payload.error || 'Forecast unavailable.')
        } else {
          setStatus('ready')
        }
      } catch (err) {
        setStatus('error')
        setError(err instanceof ApiError ? err.message : 'Unable to load forecast.')
      } finally {
        setRefreshing(false)
      }
    },
    [dam.id],
  )

  useEffect(() => {
    void load(false)
  }, [load])

  const timeline = useMemo(() => {
    const observed = data?.observed ?? []
    const forecast = data?.forecast ?? []
    const labels = [
      ...observed.map((point) => formatClock(point.timestamp)),
      ...forecast.map((point) => formatClock(point.timestamp)),
    ]
    const observedSeries = [
      ...observed.map((point) => point.value),
      ...forecast.map(() => null),
    ]
    const forecastSeries = [
      ...observed.map((_, index) =>
        index === observed.length - 1 ? observed[index]?.value ?? null : null,
      ),
      ...forecast.map((point) => point.value),
    ]
    const upper = forecastSeries.map((value) =>
      value == null ? null : Number((value + Math.max(0.15, Math.abs(value) * 0.004)).toFixed(3)),
    )
    const lower = forecastSeries.map((value) =>
      value == null ? null : Number((value - Math.max(0.15, Math.abs(value) * 0.004)).toFixed(3)),
    )
    return { labels, observedSeries, forecastSeries, upper, lower }
  }, [data])

  const chartData = {
    labels: timeline.labels,
    datasets: [
      {
        label: 'Confidence upper',
        data: timeline.upper,
        borderColor: 'transparent',
        backgroundColor: 'rgba(59, 130, 246, 0.12)',
        pointRadius: 0,
        fill: '+1',
        tension: 0.25,
      },
      {
        label: 'Confidence lower',
        data: timeline.lower,
        borderColor: 'transparent',
        backgroundColor: 'rgba(59, 130, 246, 0.12)',
        pointRadius: 0,
        fill: false,
        tension: 0.25,
      },
      {
        label: 'Observed',
        data: timeline.observedSeries,
        borderColor: '#0ea5e9',
        backgroundColor: '#0ea5e9',
        spanGaps: false,
        tension: 0.25,
        pointRadius: 3,
      },
      {
        label: 'LSTM forecast',
        data: timeline.forecastSeries,
        borderColor: '#f59e0b',
        backgroundColor: '#f59e0b',
        borderDash: [6, 4],
        spanGaps: false,
        tension: 0.25,
        pointRadius: 3,
      },
    ],
  }

  const current = data?.currentObserved
  const finalForecast = data?.finalForecast
  const change = data?.expectedChange
  const changePrefix = change != null && change >= 0 ? '+' : ''

  if (status === 'loading' && !data) {
    return (
      <div className="reservoir-prediction-panel">
        <div className="dam-monitor-api-banner" role="status">
          <p>Running live LSTM forecast for {dam.name}…</p>
        </div>
      </div>
    )
  }

  if (status === 'error' && !data?.forecast.length) {
    return (
      <div className="reservoir-prediction-panel">
        <div className="dam-monitor-api-banner error" role="status">
          <p>{error || 'Forecast unavailable.'}</p>
          <p>
            The model needs at least 24 realtime samples (precipitation, humidity, temperature, and
            reservoir level).
          </p>
          <button type="button" onClick={() => void load(true)}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="reservoir-prediction-panel">
      <section className="prediction-overview-card">
        <div>
          <p className="page-eyebrow">Live LSTM forecast</p>
          <h3>Next {data?.horizonHours ?? 5} hours of reservoir water level</h3>
          <p>
            Model uses the last {data?.model.stepsIn ?? 24} readings of precipitation, humidity, and
            temperature.
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary"
          disabled={refreshing}
          onClick={() => void load(true)}
        >
          <FontAwesomeIcon icon={faRotateRight} />
          {refreshing ? 'Refreshing…' : 'Refresh forecast'}
        </button>
      </section>

      <section className="prediction-summary-cards" aria-label="Prediction summary">
        <article>
          <span>Current observed</span>
          <strong>{current != null ? `${current.toFixed(3)} m` : '—'}</strong>
        </article>
        <article>
          <span>Forecast (+{data?.horizonHours ?? 5}h)</span>
          <strong>{finalForecast != null ? `${finalForecast.toFixed(3)} m` : '—'}</strong>
        </article>
        <article>
          <span>Expected change</span>
          <strong className={(change ?? 0) >= 0 ? 'positive' : 'negative'}>
            {change != null ? `${changePrefix}${change.toFixed(3)} m` : '—'}
          </strong>
        </article>
        <article>
          <span>Generated</span>
          <strong>
            {data?.generatedAt ? formatClock(data.generatedAt) : '—'}
          </strong>
        </article>
      </section>

      <section className="prediction-main-grid">
        <article className="prediction-chart-card">
          <div className="prediction-section-header">
            <div>
              <h3>Reservoir water level timeline</h3>
              <p>Observed history with live LSTM forecast.</p>
            </div>
          </div>
          <div className="prediction-timeline-chart">
            <Line
              data={chartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                  legend: {
                    labels: {
                      filter(item) {
                        return !item.text?.toLowerCase().includes('confidence')
                      },
                      color: chartText,
                      font: { family: chartFontFamily },
                      usePointStyle: true,
                    },
                  },
                  tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                      label(context) {
                        if (context.dataset.label?.toLowerCase().includes('confidence')) return ''
                        if (context.parsed.y === null) return ''
                        return `${context.dataset.label}: ${context.parsed.y.toFixed(3)} m`
                      },
                    },
                  },
                },
                scales: {
                  x: {
                    grid: { color: chartGrid },
                    ticks: { color: chartText, font: { family: chartFontFamily }, maxRotation: 45 },
                  },
                  y: {
                    grid: { color: chartGrid },
                    ticks: {
                      color: chartText,
                      font: { family: chartFontFamily },
                      callback(value) {
                        return `${value} m`
                      },
                    },
                    title: {
                      display: true,
                      text: 'Reservoir water level (m)',
                      color: chartText,
                      font: { family: chartFontFamily, weight: 'bold' },
                    },
                    grace: '8%',
                  },
                },
              }}
            />
          </div>
        </article>

        <article className="prediction-values-card">
          <div className="prediction-section-header">
            <div>
              <h3>Predicted values</h3>
              <p>Hourly LSTM outputs for this dam.</p>
            </div>
          </div>
          <div className="prediction-values-list">
            {(data?.forecast ?? []).map((row) => (
              <div key={row.timestamp}>
                <span>
                  +{row.hourOffset ?? '—'}h · {formatClock(row.timestamp)}
                </span>
                <strong>{row.value.toFixed(3)} m</strong>
              </div>
            ))}
            {!data?.forecast.length ? <p>No forecast points yet.</p> : null}
          </div>

          {data?.inputs ? (
            <div className="prediction-section-header" style={{ marginTop: '1.25rem' }}>
              <div>
                <h3>Latest model inputs</h3>
                <p>
                  Precip {data.inputs.precipitation} mm · Humidity {data.inputs.humidity}% · Temp{' '}
                  {data.inputs.temperature}°C
                </p>
              </div>
            </div>
          ) : null}
        </article>
      </section>

      {data?.error ? (
        <div className="dam-monitor-api-banner error" role="status">
          <p>{data.error}</p>
        </div>
      ) : null}
    </div>
  )
}
