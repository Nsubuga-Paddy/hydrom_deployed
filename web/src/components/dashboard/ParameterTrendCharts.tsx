import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { ChannelStation, DamRealtime } from '../../data/dams'
import { isUnavailableSensorValue } from '../../data/display'
import {
  fetchDamRealtimeHistory,
  hasNumericSeries,
  type RealtimeHistoryRange,
  type RealtimeHistoryResponse,
} from '../../api/realtime'
import { ApiError } from '../../api/client'
import { useTheme } from '../../hooks/ThemeContext'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Filler,
  Legend,
)

type WaterLevelView = 'reservoir' | 'headRace' | 'tailRace' | 'compare'

const timeRanges: { id: RealtimeHistoryRange; label: string }[] = [
  { id: '1h', label: '1h' },
  { id: '6h', label: '6h' },
  { id: '24h', label: '24h' },
  { id: '7d', label: '7d' },
]

function parseMetricValue(value: string | null): number | null {
  if (isUnavailableSensorValue(value)) return null
  const match = value!.replace(',', '').match(/-?\d+(\.\d+)?/)
  return match ? Number(match[0]) : null
}

function temperatureColor(value: number) {
  if (value < 18) return '#38bdf8'
  if (value < 25) return '#22c55e'
  if (value < 30) return '#f59e0b'
  return '#ef4444'
}

function latestFinite(values: Array<number | null> | undefined): number | null {
  if (!values?.length) return null
  for (let i = values.length - 1; i >= 0; i -= 1) {
    const value = values[i]
    if (value != null && Number.isFinite(value)) return value
  }
  return null
}

function ChartEmptyState({ message = 'Data is not available' }: { message?: string }) {
  return (
    <div className="chart-empty-state" role="status">
      <p>{message}</p>
    </div>
  )
}

interface ParameterTrendChartsProps {
  dam: DamRealtime
  station: ChannelStation
}

export function ParameterTrendCharts({ dam, station }: ParameterTrendChartsProps) {
  const { theme } = useTheme()
  const [rangeId, setRangeId] = useState<RealtimeHistoryRange>('24h')
  const [waterLevelView, setWaterLevelView] = useState<WaterLevelView>('reservoir')
  const [showStationDetails, setShowStationDetails] = useState(false)
  const [history, setHistory] = useState<RealtimeHistoryResponse | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)

  const chartText = theme === 'dark' ? '#cbd5e1' : '#666666'
  const chartGrid =
    theme === 'dark' ? 'rgba(148, 163, 184, 0.18)' : 'rgba(0, 0, 0, 0.08)'
  const chartFontFamily =
    "'Century Gothic', CenturyGothic, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"

  useEffect(() => {
    let cancelled = false

    async function load() {
      setStatus('loading')
      setError(null)
      try {
        const data = await fetchDamRealtimeHistory(dam.id, rangeId)
        if (cancelled) return
        setHistory(data)
        setStatus('ready')
      } catch (err) {
        if (cancelled) return
        setHistory(null)
        setStatus('error')
        setError(err instanceof ApiError ? err.message : 'Unable to load chart history.')
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [dam.id, rangeId])

  const labels = history?.labels ?? []
  const reservoirValues = history?.reservoirWaterLevels ?? []
  const headRaceValues = history?.headRaceWaterLevels ?? []
  const tailRaceValues = history?.tailRaceWaterLevels ?? []
  const humidityValues = history?.humidity ?? []
  const temperatureValues = history?.temperature ?? []
  const precipitationValues = history?.precipitation ?? []

  const hasReservoir = hasNumericSeries(reservoirValues)
  const hasHeadRace = hasNumericSeries(headRaceValues)
  const hasTailRace = hasNumericSeries(tailRaceValues)
  const hasHumidity = hasNumericSeries(humidityValues)
  const hasTemperature = hasNumericSeries(temperatureValues)
  const hasPrecipitation = hasNumericSeries(precipitationValues)
  // Open-channel velocity / discharge sensors are not installed yet.
  const hasVelocity = false
  const hasFlow = hasNumericSeries(history?.discharges)

  const current = useMemo(
    () => ({
      humidity: latestFinite(humidityValues) ?? parseMetricValue(dam.metrics.humidity),
      temperature: latestFinite(temperatureValues) ?? parseMetricValue(dam.metrics.temperature),
      precipitation:
        latestFinite(precipitationValues) ?? parseMetricValue(dam.metrics.precipitation),
      reservoir:
        latestFinite(reservoirValues) ?? parseMetricValue(dam.metrics.reservoirWaterLevel),
    }),
    [
      humidityValues,
      temperatureValues,
      precipitationValues,
      reservoirValues,
      dam.metrics.humidity,
      dam.metrics.temperature,
      dam.metrics.precipitation,
      dam.metrics.reservoirWaterLevel,
    ],
  )

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: {
        labels: { color: chartText, font: { family: chartFontFamily } },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    scales: {
      x: {
        ticks: {
          color: chartText,
          font: { family: chartFontFamily, size: 10 },
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 6,
        },
        grid: { color: chartGrid },
      },
      y: {
        ticks: { color: chartText, font: { family: chartFontFamily, size: 10 } },
        grid: { color: chartGrid },
      },
    },
  }

  const compactLineOptions = {
    ...lineOptions,
    plugins: { ...lineOptions.plugins, legend: { display: false } },
  }

  const gaugeOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    circumference: 180,
    rotation: 270,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
    },
  }

  const waterLevelData = {
    labels,
    datasets: [
      ...(hasReservoir && (waterLevelView === 'reservoir' || waterLevelView === 'compare')
        ? [
            {
              label: 'Reservoir',
              data: reservoirValues,
              borderColor: theme === 'dark' ? '#38bdf8' : '#0896fc',
              backgroundColor:
                theme === 'dark' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(8, 150, 252, 0.16)',
              borderWidth: 2,
              pointRadius: 2,
              pointHoverRadius: 4,
              tension: 0.35,
              fill: waterLevelView === 'reservoir',
              spanGaps: false,
            },
          ]
        : []),
      ...(hasHeadRace && (waterLevelView === 'headRace' || waterLevelView === 'compare')
        ? [
            {
              label: 'Head race',
              data: headRaceValues,
              borderColor: '#8b5cf6',
              backgroundColor: 'rgba(139, 92, 246, 0.12)',
              borderDash: waterLevelView === 'compare' ? [6, 5] : undefined,
              borderWidth: 2,
              pointRadius: 2,
              pointHoverRadius: 4,
              tension: 0.35,
              fill: waterLevelView === 'headRace',
              spanGaps: false,
            },
          ]
        : []),
      ...(hasTailRace && (waterLevelView === 'tailRace' || waterLevelView === 'compare')
        ? [
            {
              label: 'Tail race',
              data: tailRaceValues,
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              borderDash: waterLevelView === 'compare' ? [4, 4] : undefined,
              borderWidth: 2,
              pointRadius: 2,
              pointHoverRadius: 4,
              tension: 0.35,
              fill: waterLevelView === 'tailRace',
              spanGaps: false,
            },
          ]
        : []),
    ],
  }

  const temperatureData = {
    labels,
    datasets: [
      {
        label: 'Temperature',
        data: temperatureValues,
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.13)',
        pointBackgroundColor: temperatureValues.map((value) =>
          value == null ? '#94a3b8' : temperatureColor(value),
        ),
        pointBorderColor: temperatureValues.map((value) =>
          value == null ? '#94a3b8' : temperatureColor(value),
        ),
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
        tension: 0.35,
        fill: true,
        spanGaps: false,
      },
    ],
  }

  const precipitationData = {
    labels,
    datasets: [
      {
        label: 'Precipitation',
        data: precipitationValues,
        backgroundColor: theme === 'dark' ? '#38bdf8' : '#0ea5e9',
        borderRadius: 6,
      },
    ],
  }

  const humidityValue = current.humidity ?? 0
  const humidityGaugeData = {
    labels: ['Humidity', 'Remaining'],
    datasets: [
      {
        data: [humidityValue, Math.max(0, 100 - humidityValue)],
        backgroundColor: ['#8b5cf6', theme === 'dark' ? '#334155' : '#e5e7eb'],
        borderWidth: 0,
      },
    ],
  }

  const latestTemperatureColor =
    current.temperature == null ? chartText : temperatureColor(current.temperature)

  const waterLevelAvailable =
    (waterLevelView === 'reservoir' && hasReservoir) ||
    (waterLevelView === 'headRace' && hasHeadRace) ||
    (waterLevelView === 'tailRace' && hasTailRace) ||
    (waterLevelView === 'compare' && (hasReservoir || hasHeadRace || hasTailRace))

  function renderChartBody(
    available: boolean,
    bodyClassName: string,
    chart: ReactNode,
    emptyMessage?: string,
  ) {
    if (status === 'loading') {
      return (
        <div className={bodyClassName}>
          <ChartEmptyState message="Loading chart data…" />
        </div>
      )
    }
    if (status === 'error') {
      return (
        <div className={bodyClassName}>
          <ChartEmptyState message={error || 'Unable to load chart data.'} />
        </div>
      )
    }
    if (!available) {
      return (
        <div className={bodyClassName}>
          <ChartEmptyState message={emptyMessage || 'Data is not available'} />
        </div>
      )
    }
    return <div className={bodyClassName}>{chart}</div>
  }

  return (
    <section className="parameter-charts-section" aria-label="Parameter trend charts">
      <div className="section-heading parameter-charts-heading">
        <div>
          <p className="page-eyebrow">Interactive monitoring</p>
          <h2>{dam.name} — measured parameters</h2>
          <p>Charts plotted from Hydro-M database readings for the selected time range.</p>
        </div>

        <div className="chart-toolbar" aria-label="Chart controls">
          <div className="time-range-toggle" aria-label="Time range">
            {timeRanges.map((item) => (
              <button
                key={item.id}
                type="button"
                className={rangeId === item.id ? 'active' : ''}
                onClick={() => setRangeId(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="chart-action-btn"
            onClick={() => setShowStationDetails((show) => !show)}
          >
            {showStationDetails ? 'Hide station' : 'Station info'}
          </button>
        </div>
      </div>

      {showStationDetails && (
        <div className="station-details-card">
          <strong>{station.name}</strong>
          <span>{station.location}</span>
          <span>{station.distanceFromTailRace}</span>
        </div>
      )}

      <div className="parameter-charts-grid">
        <article className="parameter-chart-card wide">
          <div className="parameter-chart-header">
            <div>
              <h3>Water level comparison</h3>
              <span>Reservoir, head race, and tail race</span>
            </div>
            <div className="chart-segmented-control" aria-label="Water level display">
              <button
                type="button"
                className={waterLevelView === 'reservoir' ? 'active' : ''}
                onClick={() => setWaterLevelView('reservoir')}
              >
                Reservoir
              </button>
              <button
                type="button"
                className={waterLevelView === 'headRace' ? 'active' : ''}
                disabled={!hasHeadRace}
                title={!hasHeadRace ? 'Head race water-level sensor not yet available' : undefined}
                onClick={() => setWaterLevelView('headRace')}
              >
                Head race
              </button>
              <button
                type="button"
                className={waterLevelView === 'tailRace' ? 'active' : ''}
                disabled={!hasTailRace}
                title={!hasTailRace ? 'Tail race water-level sensor not yet available' : undefined}
                onClick={() => setWaterLevelView('tailRace')}
              >
                Tail race
              </button>
              <button
                type="button"
                className={waterLevelView === 'compare' ? 'active' : ''}
                onClick={() => setWaterLevelView('compare')}
              >
                Compare
              </button>
            </div>
          </div>
          <div className="threshold-legend">
            <span className="normal">Normal</span>
            <span className="watch">Watch</span>
            <span className="critical">Critical</span>
          </div>
          {renderChartBody(
            waterLevelAvailable,
            'parameter-chart-body large',
            <Line data={waterLevelData} options={lineOptions} />,
            waterLevelView === 'headRace'
              ? 'Head race data is not available'
              : waterLevelView === 'tailRace'
                ? 'Tail race data is not available'
                : 'Water level data is not available',
          )}
        </article>

        <article className="parameter-chart-card">
          <div className="parameter-chart-header">
            <div>
              <h3>Velocity</h3>
              <span>Open-channel speed</span>
            </div>
            <strong>-</strong>
          </div>
          {renderChartBody(
            hasVelocity,
            'parameter-chart-body',
            null,
            'Velocity data is not available',
          )}
        </article>

        <article className="parameter-chart-card">
          <div className="parameter-chart-header">
            <div>
              <h3>Precipitation</h3>
              <span>Rainfall by interval</span>
            </div>
            <strong>
              {current.precipitation == null ? '-' : `${current.precipitation.toFixed(2)}mm`}
            </strong>
          </div>
          {renderChartBody(
            hasPrecipitation,
            'parameter-chart-body',
            <Bar data={precipitationData} options={compactLineOptions} />,
            'Precipitation data is not available',
          )}
        </article>

        <article className="parameter-chart-card">
          <div className="parameter-chart-header">
            <div>
              <h3>Temperature</h3>
              <span>Cold-to-hot color variation</span>
            </div>
            <strong style={{ color: latestTemperatureColor }}>
              {current.temperature == null ? '-' : `${current.temperature.toFixed(2)}°C`}
            </strong>
          </div>
          <div className="temperature-scale">
            <span>Cold</span>
            <span>Mild</span>
            <span>Hot</span>
          </div>
          {renderChartBody(
            hasTemperature,
            'parameter-chart-body',
            <Line data={temperatureData} options={compactLineOptions} />,
            'Temperature data is not available',
          )}
        </article>

        <article className="parameter-chart-card">
          <div className="parameter-chart-header">
            <div>
              <h3>Humidity</h3>
              <span>Current condition with trend</span>
            </div>
            <strong>{current.humidity == null ? '-' : `${current.humidity}%`}</strong>
          </div>
          {hasHumidity ? (
            <>
              <div className="gauge-chart-body">
                <Doughnut data={humidityGaugeData} options={gaugeOptions} />
                <div className="gauge-center-value">
                  <strong>{current.humidity == null ? '-' : `${current.humidity}%`}</strong>
                  <span>current</span>
                </div>
              </div>
              <div className="sparkline-body">
                <Line
                  data={{
                    labels,
                    datasets: [
                      {
                        label: 'Humidity trend',
                        data: humidityValues,
                        borderColor: '#8b5cf6',
                        backgroundColor: 'rgba(139, 92, 246, 0.14)',
                        borderWidth: 2,
                        pointRadius: 0,
                        tension: 0.35,
                        fill: true,
                        spanGaps: false,
                      },
                    ],
                  }}
                  options={compactLineOptions}
                />
              </div>
            </>
          ) : (
            renderChartBody(false, 'parameter-chart-body', null, 'Humidity data is not available')
          )}
        </article>

        <article className="parameter-chart-card wide">
          <div className="parameter-chart-header">
            <div>
              <h3>Tail-race discharge / flow</h3>
              <span>Discharge measured near the tail race</span>
            </div>
            <strong>-</strong>
          </div>
          <div className="threshold-legend">
            <span className="normal">Normal flow</span>
            <span className="watch">Rising</span>
            <span className="critical">High flow</span>
          </div>
          {renderChartBody(
            hasFlow,
            'parameter-chart-body large',
            null,
            'Discharge data is not available',
          )}
        </article>
      </div>
    </section>
  )
}
