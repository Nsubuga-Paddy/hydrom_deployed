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
import type { Plugin } from 'chart.js'
import { Line } from 'react-chartjs-2'
import { useMemo } from 'react'
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

interface WaterLevelChartProps {
  baseLevel: number
}

function generateChartData(baseLevel: number, variation = 30) {
  const labels: string[] = []
  const actualData: (number | null)[] = []
  const predictionData: (number | null)[] = []
  const confidenceUpper: (number | null)[] = []
  const confidenceLower: (number | null)[] = []
  let currentLevel = baseLevel - 4

  for (let i = -7; i <= 7; i++) {
    const date = new Date()
    date.setDate(date.getDate() + i)
    labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))

    if (i <= 0) {
      currentLevel += Math.sin((i + 7) * 0.85) * 2.1 + 1.2
      currentLevel = Math.max(
        baseLevel - variation / 2,
        Math.min(baseLevel + variation / 2, currentLevel),
      )
      actualData.push(currentLevel)
      predictionData.push(i === 0 ? currentLevel : null)
      confidenceUpper.push(null)
      confidenceLower.push(null)
    } else {
      currentLevel += Math.sin(i * 0.65) * 1.4 + i * 0.65
      currentLevel = Math.max(
        baseLevel - variation / 2,
        Math.min(baseLevel + variation / 2, currentLevel),
      )
      actualData.push(null)
      predictionData.push(currentLevel)
      confidenceUpper.push(currentLevel + 3 + i * 0.35)
      confidenceLower.push(currentLevel - 3 - i * 0.35)
    }
  }

  const current = actualData[7] ?? baseLevel
  const forecast = predictionData[predictionData.length - 1] ?? current
  const change = ((forecast - current) / current) * 100

  return {
    labels,
    actualData,
    predictionData,
    confidenceUpper,
    confidenceLower,
    current,
    forecast,
    change,
    confidence: 92,
  }
}

export function WaterLevelChart({ baseLevel }: WaterLevelChartProps) {
  const { theme } = useTheme()
  const chartText = theme === 'dark' ? '#cbd5e1' : '#666666'
  const chartGrid =
    theme === 'dark' ? 'rgba(148, 163, 184, 0.18)' : 'rgba(0, 0, 0, 0.1)'
  const pointBorder = theme === 'dark' ? '#172033' : '#ffffff'
  const chartFontFamily =
    "'Century Gothic', CenturyGothic, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
  const forecastZoneColor =
    theme === 'dark' ? 'rgba(56, 189, 248, 0.07)' : 'rgba(8, 150, 252, 0.05)'
  const confidenceBandColor =
    theme === 'dark' ? 'rgba(16, 185, 129, 0.14)' : 'rgba(16, 185, 129, 0.16)'

  const forecastZonePlugin = useMemo<Plugin<'line'>>(
    () => ({
      id: 'forecastZone',
      beforeDatasetsDraw(chart) {
        const { ctx, chartArea, scales } = chart
        const xScale = scales.x
        if (!xScale || !chartArea) return

        const nowX = xScale.getPixelForValue(7)
        ctx.save()
        ctx.fillStyle = forecastZoneColor
        ctx.fillRect(nowX, chartArea.top, chartArea.right - nowX, chartArea.bottom - chartArea.top)
        ctx.restore()
      },
    }),
    [forecastZoneColor],
  )

  const chartData = useMemo(() => {
    const data = generateChartData(baseLevel)
    return {
      summary: {
        current: data.current,
        forecast: data.forecast,
        change: data.change,
        confidence: data.confidence,
      },
      labels: data.labels,
      datasets: [
        {
          label: 'Confidence Upper',
          data: data.confidenceUpper,
          borderColor: 'transparent',
          backgroundColor: 'transparent',
          pointRadius: 0,
          pointHoverRadius: 0,
          tension: 0.4,
          fill: false,
        },
        {
          label: 'Confidence Range',
          data: data.confidenceLower,
          borderColor: 'transparent',
          backgroundColor: confidenceBandColor,
          pointRadius: 0,
          pointHoverRadius: 0,
          tension: 0.4,
          fill: '-1',
        },
        {
          label: 'Actual Water Level',
          data: data.actualData,
          borderColor: '#0896FC',
          backgroundColor: 'rgba(8, 150, 252, 0.1)',
          borderWidth: 3,
          fill: false,
          tension: 0.4,
          pointBackgroundColor: '#0896FC',
          pointBorderColor: pointBorder,
          pointBorderWidth: 2,
          pointRadius: 4,
          spanGaps: false,
        },
        {
          label: 'Predicted Water Level',
          data: data.predictionData,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 3,
          borderDash: [5, 5],
          fill: false,
          tension: 0.4,
          pointBackgroundColor: '#10b981',
          pointBorderColor: pointBorder,
          pointBorderWidth: 2,
          pointRadius: 4,
          spanGaps: false,
        },
      ],
    }
  }, [baseLevel, confidenceBandColor, pointBorder])

  const changeDirection = chartData.summary.change >= 0 ? '+' : ''

  return (
    <div className="prediction-chart-shell">
      <div className="prediction-chart-header">
        <div>
          <p className="prediction-eyebrow">Observed trend with 7-day prediction</p>
        </div>
        <span className="forecast-badge">Forecast zone</span>
      </div>

      <div className="chart-container prediction-chart-container">
        <Line
          data={chartData}
          plugins={[forecastZonePlugin]}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            font: {
              family: chartFontFamily,
            },
            plugins: {
              legend: {
                display: true,
                position: 'top',
                labels: {
                  filter(item) {
                    return !item.text?.includes('Confidence')
                  },
                  boxWidth: 12,
                  boxHeight: 12,
                  padding: 15,
                  font: { family: chartFontFamily, size: 12 },
                  color: chartText,
                  usePointStyle: true,
                },
              },
              tooltip: {
                mode: 'index',
                intersect: false,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                callbacks: {
                  label(context) {
                    if (context.dataset.label?.includes('Confidence')) return ''
                    if (context.parsed.y !== null) {
                      return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}m`
                    }
                    return ''
                  },
                },
              },
            },
            scales: {
              x: {
                grid: { color: chartGrid },
                ticks: {
                  color: chartText,
                  maxRotation: 0,
                  autoSkip: true,
                  maxTicksLimit: 7,
                  font: { family: chartFontFamily, size: 11 },
                },
              },
              y: {
                grid: { color: chartGrid },
                ticks: {
                  color: chartText,
                  font: { family: chartFontFamily, size: 11 },
                  callback(value) {
                    return `${value}m`
                  },
                },
                title: {
                  display: true,
                  text: 'Water Level (m)',
                  color: chartText,
                  font: { family: chartFontFamily, size: 12, weight: 'bold' },
                },
                beginAtZero: false,
                grace: '6%',
              },
            },
            interaction: {
              mode: 'nearest',
              axis: 'x',
              intersect: false,
            },
          }}
        />
      </div>

      <div className="prediction-summary-grid">
        <div className="prediction-summary-card">
          <span>Current</span>
          <strong>{chartData.summary.current.toFixed(1)}m</strong>
        </div>
        <div className="prediction-summary-card">
          <span>7-day forecast</span>
          <strong>{chartData.summary.forecast.toFixed(1)}m</strong>
        </div>
        <div className="prediction-summary-card">
          <span>Expected change</span>
          <strong className={chartData.summary.change >= 0 ? 'positive' : 'negative'}>
            {changeDirection}
            {chartData.summary.change.toFixed(1)}%
          </strong>
        </div>
        <div className="prediction-summary-card">
          <span>Confidence</span>
          <strong>{chartData.summary.confidence}%</strong>
        </div>
      </div>
    </div>
  )
}
