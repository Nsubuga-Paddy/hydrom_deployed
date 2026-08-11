import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'
import { useMemo, useState } from 'react'
import type { ChannelStation, DamRealtime } from '../../data/dams'
import { useTheme } from '../../hooks/ThemeContext'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
)

type PredictionHorizon = '6h' | '12h' | '24h'

const horizons: { id: PredictionHorizon; label: string; points: number; stepMinutes: number }[] = [
  { id: '6h', label: '6h', points: 5, stepMinutes: 90 },
  { id: '12h', label: '12h', points: 8, stepMinutes: 90 },
  { id: '24h', label: '24h', points: 9, stepMinutes: 180 },
]

function parseMetricValue(value: string): number {
  const match = value.replace(',', '').match(/-?\d+(\.\d+)?/)
  return match ? Number(match[0]) : 0
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function generateForecast(dam: DamRealtime, station: ChannelStation, horizon: (typeof horizons)[number]) {
  const reservoirLevel = parseMetricValue(dam.metrics.reservoirWaterLevel)
  const flow = parseMetricValue(station.metrics.flow)
  const velocity = parseMetricValue(station.metrics.velocity)
  const rainfall = parseMetricValue(dam.metrics.precipitation)
  const humidity = parseMetricValue(dam.metrics.humidity)
  const temperature = parseMetricValue(dam.metrics.temperature)
  const now = new Date()
  const labels: string[] = []
  const observed: (number | null)[] = []
  const predicted: (number | null)[] = []
  const confidenceUpper: (number | null)[] = []
  const confidenceLower: (number | null)[] = []

  const inflowPressure = flow * 0.0009 + velocity * 0.34 + rainfall * 0.18
  const evaporationPressure = Math.max(0, temperature - 24) * 0.045
  const humidityBuffer = humidity > 75 ? 0.12 : 0
  const netHourlyChange = inflowPressure - evaporationPressure + humidityBuffer
  let current = reservoirLevel - netHourlyChange * 2.4

  for (let i = -4; i <= horizon.points; i++) {
    const timestamp = new Date(now)
    timestamp.setMinutes(timestamp.getMinutes() + i * horizon.stepMinutes)
    labels.push(formatTime(timestamp))

    if (i <= 0) {
      current += Math.sin((i + 5) * 0.65) * 0.7 + netHourlyChange * 0.32
      observed.push(Number(current.toFixed(1)))
      predicted.push(i === 0 ? Number(current.toFixed(1)) : null)
      confidenceUpper.push(null)
      confidenceLower.push(null)
    } else {
      current += Math.sin(i * 0.55) * 0.5 + netHourlyChange * (horizon.stepMinutes / 60) * 0.7
      const forecast = Number(current.toFixed(1))
      observed.push(null)
      predicted.push(forecast)
      confidenceUpper.push(Number((forecast + 0.9 + i * 0.12).toFixed(1)))
      confidenceLower.push(Number((forecast - 0.9 - i * 0.12).toFixed(1)))
    }
  }

  const predictionRows = labels
    .map((label, index) => ({ time: label, value: predicted[index] }))
    .filter((row): row is { time: string; value: number } => row.value !== null)

  const latestObserved = [...observed].reverse().find((value) => value !== null) ?? reservoirLevel
  const finalForecast = predictionRows.at(-1)?.value ?? latestObserved
  const expectedChange = finalForecast - latestObserved
  const confidence = Math.max(76, Math.min(94, 88 - rainfall * 0.4 + velocity * 1.5))

  return {
    labels,
    observed,
    predicted,
    confidenceUpper,
    confidenceLower,
    predictionRows,
    latestObserved,
    finalForecast,
    expectedChange,
    confidence,
    drivers: [
      {
        label: 'Upstream cascade activity',
        detail: 'Likely upstream release signal based on rising downstream flow.',
        impact: Math.min(96, Math.round(flow / 6)),
        direction: 'Raises forecast',
      },
      {
        label: 'Open-channel flow',
        detail: `${station.metrics.flow} detected near the tail race.`,
        impact: Math.min(94, Math.round(flow / 5.5)),
        direction: 'Inflow pressure',
      },
      {
        label: 'Channel velocity',
        detail: `${station.metrics.velocity} indicates how quickly changes may arrive.`,
        impact: Math.min(90, Math.round(velocity * 32)),
        direction: 'Timing signal',
      },
      {
        label: 'Weather conditions',
        detail: `${dam.metrics.precipitation} precipitation and ${dam.metrics.temperature} temperature included.`,
        impact: Math.min(88, Math.round(rainfall * 8 + Math.max(0, temperature - 20) * 2)),
        direction: rainfall > 4 ? 'Adds inflow' : 'Low weather effect',
      },
    ],
  }
}

function generateForecastPerformance(dam: DamRealtime) {
  const currentLevel = parseMetricValue(dam.metrics.reservoirWaterLevel)
  const labels: string[] = []
  const predicted: number[] = []
  const actual: number[] = []
  const errors: number[] = []
  const now = new Date()

  for (let i = 7; i >= 0; i--) {
    const timestamp = new Date(now)
    timestamp.setHours(timestamp.getHours() - i * 2)
    labels.push(formatTime(timestamp))

    const observedLevel = currentLevel - i * 0.45 + Math.sin(i * 0.7) * 0.8
    const forecastError = Math.sin(i * 1.15) * 0.55 + (i % 2 === 0 ? 0.18 : -0.12)
    const forecastLevel = observedLevel - forecastError

    actual.push(Number(observedLevel.toFixed(1)))
    predicted.push(Number(forecastLevel.toFixed(1)))
    errors.push(Number((observedLevel - forecastLevel).toFixed(1)))
  }

  const absoluteErrors = errors.map((error) => Math.abs(error))
  const mae = absoluteErrors.reduce((total, error) => total + error, 0) / absoluteErrors.length
  const maxError = Math.max(...absoluteErrors)
  const withinTolerance =
    (absoluteErrors.filter((error) => error <= 1).length / absoluteErrors.length) * 100
  const bias = errors.reduce((total, error) => total + error, 0) / errors.length

  return {
    labels,
    predicted,
    actual,
    errors,
    mae,
    maxError,
    withinTolerance,
    bias,
  }
}

interface ReservoirPredictionPanelProps {
  dam: DamRealtime
  station: ChannelStation
}

export function ReservoirPredictionPanel({ dam, station }: ReservoirPredictionPanelProps) {
  const { theme } = useTheme()
  const [horizonId, setHorizonId] = useState<PredictionHorizon>('12h')
  const horizon = horizons.find((item) => item.id === horizonId) ?? horizons[1]
  const forecast = useMemo(() => generateForecast(dam, station, horizon), [dam, station, horizon])
  const chartText = theme === 'dark' ? '#cbd5e1' : '#666666'
  const chartGrid =
    theme === 'dark' ? 'rgba(148, 163, 184, 0.18)' : 'rgba(0, 0, 0, 0.08)'
  const chartFontFamily =
    "'Century Gothic', CenturyGothic, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
  const changePrefix = forecast.expectedChange >= 0 ? '+' : ''

  const chartData = {
    labels: forecast.labels,
    datasets: [
      {
        label: 'Confidence upper',
        data: forecast.confidenceUpper,
        borderColor: 'transparent',
        backgroundColor: 'transparent',
        pointRadius: 0,
        tension: 0.35,
      },
      {
        label: 'Confidence range',
        data: forecast.confidenceLower,
        borderColor: 'transparent',
        backgroundColor:
          theme === 'dark' ? 'rgba(16, 185, 129, 0.16)' : 'rgba(16, 185, 129, 0.18)',
        pointRadius: 0,
        tension: 0.35,
        fill: '-1',
      },
      {
        label: 'Observed reservoir level',
        data: forecast.observed,
        borderColor: '#0896fc',
        backgroundColor: 'rgba(8, 150, 252, 0.12)',
        borderWidth: 3,
        pointRadius: 4,
        tension: 0.35,
        spanGaps: false,
      },
      {
        label: 'Predicted reservoir level',
        data: forecast.predicted,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        borderDash: [6, 5],
        borderWidth: 3,
        pointRadius: 4,
        tension: 0.35,
        spanGaps: false,
      },
    ],
  }

  const driverImpactData = {
    labels: forecast.drivers.map((driver) => driver.label),
    datasets: [
      {
        label: 'Forecast influence',
        data: forecast.drivers.map((driver) => driver.impact),
        backgroundColor: ['#0896fc', '#10b981', '#f59e0b', '#8b5cf6'],
        borderRadius: 8,
      },
    ],
  }

  const performance = useMemo(() => generateForecastPerformance(dam), [dam])
  const performanceComparisonData = {
    labels: performance.labels,
    datasets: [
      {
        label: 'Previous forecast',
        data: performance.predicted,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        borderDash: [6, 5],
        borderWidth: 3,
        pointRadius: 4,
        tension: 0.35,
      },
      {
        label: 'Actual observed',
        data: performance.actual,
        borderColor: '#0896fc',
        backgroundColor: 'rgba(8, 150, 252, 0.12)',
        borderWidth: 3,
        pointRadius: 4,
        tension: 0.35,
      },
    ],
  }
  const performanceErrorData = {
    labels: performance.labels,
    datasets: [
      {
        label: 'Forecast error',
        data: performance.errors,
        backgroundColor: performance.errors.map((error) => {
          const absoluteError = Math.abs(error)
          if (absoluteError <= 0.5) return '#10b981'
          if (absoluteError <= 1) return '#f59e0b'
          return '#ef4444'
        }),
        borderRadius: 7,
      },
    ],
  }

  return (
    <div className="reservoir-prediction-panel">
      <section className="prediction-overview-card">
        <div>
          <p className="page-eyebrow">Reservoir forecast</p>
          <h3>Predicted reservoir water level by time of day</h3>
        </div>

        <div className="prediction-horizon-toggle" aria-label="Prediction horizon">
          {horizons.map((item) => (
            <button
              key={item.id}
              type="button"
              className={horizonId === item.id ? 'active' : ''}
              onClick={() => setHorizonId(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className="prediction-summary-cards" aria-label="Prediction summary">
        <article>
          <span>Current observed</span>
          <strong>{forecast.latestObserved.toFixed(1)} mm</strong>
        </article>
        <article>
          <span>Forecast at {forecast.predictionRows.at(-1)?.time}</span>
          <strong>{forecast.finalForecast.toFixed(1)} mm</strong>
        </article>
        <article>
          <span>Expected change</span>
          <strong className={forecast.expectedChange >= 0 ? 'positive' : 'negative'}>
            {changePrefix}
            {forecast.expectedChange.toFixed(1)} mm
          </strong>
        </article>
        <article>
          <span>Confidence</span>
          <strong>{forecast.confidence.toFixed(0)}%</strong>
        </article>
      </section>

      <section className="prediction-main-grid">
        <article className="prediction-chart-card">
          <div className="prediction-section-header">
            <div>
              <h3>Reservoir water level timeline</h3>
            </div>
            <span>Confidence band</span>
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
                        return !item.text?.includes('Confidence')
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
                        if (context.dataset.label?.includes('Confidence')) return ''
                        if (context.parsed.y === null) return ''
                        return `${context.dataset.label}: ${context.parsed.y.toFixed(1)} mm`
                      },
                    },
                  },
                },
                scales: {
                  x: {
                    grid: { color: chartGrid },
                    ticks: { color: chartText, font: { family: chartFontFamily } },
                  },
                  y: {
                    grid: { color: chartGrid },
                    ticks: {
                      color: chartText,
                      font: { family: chartFontFamily },
                      callback(value) {
                        return `${value} mm`
                      },
                    },
                    title: {
                      display: true,
                      text: 'Reservoir water level (mm)',
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
              <p>Exact forecasted reservoir levels by time.</p>
            </div>
          </div>
          <div className="prediction-values-list">
            {forecast.predictionRows.map((row) => (
              <div key={row.time}>
                <span>{row.time}</span>
                <strong>{row.value.toFixed(1)} mm</strong>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="prediction-drivers-section">
        <div className="prediction-section-header">
          <div>
            <h3>Factors influencing this forecast</h3>
            <p>
              The system weighs upstream cascade activity, open-channel measurements, and weather
              conditions before projecting reservoir changes.
            </p>
          </div>
        </div>

        <div className="driver-impact-chart">
          <Bar
            data={driverImpactData}
            options={{
              indexAxis: 'y',
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label(context) {
                      return `Influence: ${context.parsed.x}%`
                    },
                    afterLabel(context) {
                      const driver = forecast.drivers[context.dataIndex]
                      return driver ? [`Signal: ${driver.direction}`, driver.detail] : []
                    },
                  },
                },
              },
              scales: {
                x: {
                  min: 0,
                  max: 100,
                  grid: { color: chartGrid },
                  ticks: {
                    color: chartText,
                    font: { family: chartFontFamily },
                    callback(value) {
                      return `${value}%`
                    },
                  },
                },
                y: {
                  grid: { display: false },
                  ticks: { color: chartText, font: { family: chartFontFamily } },
                },
              },
            }}
          />
        </div>
      </section>

      <section className="forecast-performance-section">
        <div className="prediction-section-header">
          <div>
            <h3>Previous forecast performance</h3>
            <p>See how previous forecasts performed against actual readings.</p>
          </div>
        </div>

        <div className="forecast-performance-summary">
          <article>
            <span>Mean absolute error</span>
            <strong>{performance.mae.toFixed(1)} mm</strong>
          </article>
          <article>
            <span>Highest error</span>
            <strong>{performance.maxError.toFixed(1)} mm</strong>
          </article>
          <article>
            <span>Within ±1.0 mm</span>
            <strong>{performance.withinTolerance.toFixed(0)}%</strong>
          </article>
          <article>
            <span>Model bias</span>
            <strong className={performance.bias >= 0 ? 'positive' : 'negative'}>
              {performance.bias >= 0 ? '+' : ''}
              {performance.bias.toFixed(1)} mm
            </strong>
          </article>
        </div>

        <div className="forecast-performance-grid">
          <article className="forecast-performance-card">
            <div className="prediction-section-header">
              <div>
                <h3>Forecast vs actual</h3>
              </div>
            </div>
            <div className="forecast-performance-chart">
              <Line
                data={performanceComparisonData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: { mode: 'index', intersect: false },
                  plugins: {
                    legend: {
                      labels: {
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
                          if (context.parsed.y === null) return ''
                          return `${context.dataset.label}: ${context.parsed.y.toFixed(1)} mm`
                        },
                      },
                    },
                  },
                  scales: {
                    x: {
                      grid: { color: chartGrid },
                      ticks: { color: chartText, font: { family: chartFontFamily } },
                    },
                    y: {
                      grid: { color: chartGrid },
                      ticks: {
                        color: chartText,
                        font: { family: chartFontFamily },
                        callback(value) {
                          return `${value} mm`
                        },
                      },
                      grace: '8%',
                    },
                  },
                }}
              />
            </div>
          </article>

          <article className="forecast-performance-card">
            <div className="prediction-section-header">
              <div>
                <h3>Forecast error</h3>
              </div>
            </div>
            <div className="forecast-performance-chart">
              <Bar
                data={performanceErrorData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label(context) {
                          if (context.parsed.y === null) return ''
                          return `Error: ${context.parsed.y.toFixed(1)} mm`
                        },
                        afterLabel(context) {
                          if (context.parsed.y === null) return ''
                          const error = Math.abs(context.parsed.y)
                          if (error <= 0.5) return 'Status: accurate'
                          if (error <= 1) return 'Status: acceptable'
                          return 'Status: review'
                        },
                      },
                    },
                  },
                  scales: {
                    x: {
                      grid: { display: false },
                      ticks: { color: chartText, font: { family: chartFontFamily } },
                    },
                    y: {
                      grid: { color: chartGrid },
                      ticks: {
                        color: chartText,
                        font: { family: chartFontFamily },
                        callback(value) {
                          return `${value} mm`
                        },
                      },
                    },
                  },
                }}
              />
            </div>
          </article>
        </div>
      </section>

    </div>
  )
}
