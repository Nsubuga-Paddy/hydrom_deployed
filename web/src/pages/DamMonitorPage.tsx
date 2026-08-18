import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faChartLine,
  faClock,
  faMapMarkerAlt,
  faSatelliteDish,
} from '@fortawesome/free-solid-svg-icons'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { GisMonitoringPanel } from '../components/dashboard/GisMonitoringPanel'
import { MetricCard } from '../components/dashboard/MetricCard'
import { OpenChannelMonitoring } from '../components/dashboard/OpenChannelMonitoring'
import { ParameterTrendCharts } from '../components/dashboard/ParameterTrendCharts'
import { ReservoirPredictionPanel } from '../components/dashboard/ReservoirPredictionPanel'
import { WaterLevelMetricCard } from '../components/dashboard/WaterLevelMetricCard'
import {
  createRealtimePlaceholder,
  damPath,
  damViewModes,
  getChannelStation,
  resolveDamView,
  type DamGis,
  type DamRealtime,
  type DamViewMode,
} from '../data/dams'
import { useClock } from '../hooks/useClock'
import { useDams } from '../hooks/DamsContext'
import { useRealtimeDam } from '../hooks/useRealtimeDam'

const realtimeMetricMeta = [
  { key: 'dispatch', label: 'Dispatch' },
  { key: 'discharge', label: 'Discharge' },
  { key: 'humidity', label: 'Humidity' },
  { key: 'temperature', label: 'Temperature' },
  { key: 'precipitation', label: 'Precipitation' },
] as const

const viewIcons: Record<DamViewMode, typeof faClock> = {
  realtime: faClock,
  gis: faMapMarkerAlt,
  predictions: faChartLine,
}

const statusBadges: Record<DamViewMode, { label: string; icon?: typeof faClock }> = {
  realtime: { label: 'Live' },
  gis: { label: 'Remote sensing', icon: faSatelliteDish },
  predictions: { label: 'Prediction', icon: faChartLine },
}

const viewCopy: Record<DamViewMode, { title: string; description: (damName: string) => string }> = {
  realtime: {
    title: 'Real-time Monitoring',
    description: (damName) => `Live telemetry for ${damName}.`,
  },
  gis: {
    title: 'GIS Monitoring',
    description: (damName) =>
      `Station water levels plus Open-Meteo location weather for ${damName}.`,
  },
  predictions: {
    title: 'Water Level Prediction',
    description: (damName) => `Observed trend with 7-day prediction for ${damName}.`,
  },
}

export function DamMonitorPage() {
  const { damId, view: viewParam } = useParams()
  const navigate = useNavigate()
  const clock = useClock()
  const { dams, status, error, defaultDamId, getGisDam, getRealtimeDam, refresh } = useDams()

  const view = resolveDamView(viewParam)
  if (viewParam && viewParam !== view) {
    return <Navigate to={damPath(damId || defaultDamId || 'kiira', view)} replace />
  }

  if (status === 'loading' && dams.length === 0) {
    return (
      <div className="dam-monitor-page">
        <div className="dam-monitor-api-banner" role="status">
          <p>Loading dams from Hydro-M…</p>
        </div>
      </div>
    )
  }

  if (status === 'error' && dams.length === 0) {
    return (
      <div className="dam-monitor-page">
        <div className="dam-monitor-api-banner error" role="status">
          <p>{error || 'Unable to load dams from the backend.'}</p>
          <button type="button" onClick={refresh}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (dams.length === 0) {
    return (
      <div className="dam-monitor-page">
        <div className="dam-monitor-api-banner" role="status">
          <p>No dams have been uploaded in Django admin yet.</p>
        </div>
      </div>
    )
  }

  const knownDam = dams.some((dam) => dam.id === damId)
  if (!knownDam) {
    return <Navigate to={damPath(defaultDamId || dams[0].id, view)} replace />
  }

  return (
    <DamMonitorContent
      damId={damId!}
      view={view}
      clock={clock}
      navigate={navigate}
      dams={dams}
      listRealtimeDam={getRealtimeDam(damId) ?? createRealtimePlaceholder(damId!)}
      gisDam={
        getGisDam(damId) ?? {
          id: damId!,
          name: damId!,
          latitude: null,
          longitude: null,
          metrics: {
            reservoirWaterLevel: '-',
            headRaceWaterLevel: null,
            tailRaceWaterLevel: null,
            precipitation: '-',
            humidity: '-',
            temperature: '-',
            windSpeed: '-',
            weatherSource: 'Open-Meteo',
          },
        }
      }
    />
  )
}

function DamMonitorContent({
  damId,
  view,
  clock,
  navigate,
  dams,
  listRealtimeDam,
  gisDam,
}: {
  damId: string
  view: DamViewMode
  clock: ReturnType<typeof useClock>
  navigate: ReturnType<typeof useNavigate>
  dams: ReturnType<typeof useDams>['dams']
  listRealtimeDam: DamRealtime
  gisDam: DamGis
}) {
  const {
    dam: liveDam,
    status: realtimeStatus,
    error: realtimeError,
    refresh,
  } = useRealtimeDam(damId)

  const realtimeDam = view === 'realtime' ? liveDam : listRealtimeDam
  const channelStation = getChannelStation(damId)
  const copy = viewCopy[view]
  const statusBadge = statusBadges[view]

  function handleDamChange(nextDamId: string) {
    navigate(damPath(nextDamId, view))
  }

  const realtimeBadgeLabel =
    view === 'realtime'
      ? realtimeStatus === 'loading'
        ? 'Loading'
        : realtimeStatus === 'error'
          ? 'Offline'
          : 'Live'
      : statusBadge.label

  return (
    <div className="dam-monitor-page">
      <section className="realtime-hero dam-monitor-hero">
        <div>
          <p className="page-eyebrow">Selected dam</p>
          <h1>{realtimeDam.name}</h1>
          <p>
            {copy.description(realtimeDam.name)} Switch dams below, or move between Real-time, GIS,
            and Predictions.
          </p>
        </div>

        <div className="realtime-live-card">
          <span
            className={`live-status-dot${realtimeStatus === 'error' && view === 'realtime' ? ' offline' : ''}`}
          />
          <div>
            <strong>{clock.time}</strong>
            <span>
              {clock.day}, {clock.month} {clock.date}, {clock.year}
            </span>
          </div>
        </div>
      </section>

      <section className="dam-monitor-controls" aria-label="Dam and view controls">
        <div className="dam-switcher">
          <label htmlFor="dam-switcher-select">Change dam</label>
          <select
            id="dam-switcher-select"
            value={realtimeDam.id}
            onChange={(event) => handleDamChange(event.target.value)}
          >
            {dams.map((dam) => (
              <option key={dam.id} value={dam.id}>
                {dam.name}
              </option>
            ))}
          </select>
        </div>

        <nav className="dam-view-tabs" aria-label="Monitoring view">
          {damViewModes.map((mode) => (
            <Link
              key={mode.id}
              to={damPath(realtimeDam.id, mode.id)}
              className={`dam-view-tab${view === mode.id ? ' active' : ''}`}
            >
              <FontAwesomeIcon icon={viewIcons[mode.id]} />
              <span>{mode.label}</span>
            </Link>
          ))}
        </nav>
      </section>

      <section className="dam-monitor-panel">
        <div className="dam-monitor-panel-header">
          <div>
            <p className="page-eyebrow">{copy.title}</p>
            <h2>
              {realtimeDam.name} — {copy.title}
            </h2>
          </div>
          <span
            className={`dam-status-pill ${view === 'realtime' && realtimeStatus === 'live' ? 'live' : ''}${
              view === 'realtime' && realtimeStatus === 'error' ? ' offline' : ''
            }`}
          >
            {view === 'realtime' ? (
              <span className={`live-status-dot compact${realtimeStatus === 'error' ? ' offline' : ''}`} />
            ) : (
              statusBadge.icon && <FontAwesomeIcon icon={statusBadge.icon} />
            )}
            {realtimeBadgeLabel}
          </span>
        </div>

        {view === 'realtime' && (
          <div className="dam-monitor-realtime">
            {realtimeStatus === 'error' && realtimeError && (
              <div className="dam-monitor-api-banner error" role="status">
                <p>{realtimeError}</p>
                <button type="button" onClick={refresh}>
                  Retry
                </button>
              </div>
            )}

            {realtimeStatus === 'loading' && (
              <div className="dam-monitor-api-banner" role="status">
                <p>Loading live realtime readings…</p>
              </div>
            )}

            <div className="dam-metrics-grid">
              <WaterLevelMetricCard
                reservoir={realtimeDam.metrics.reservoirWaterLevel}
                headRace={realtimeDam.metrics.headRaceWaterLevel}
                tailRace={realtimeDam.metrics.tailRaceWaterLevel}
              />
              {realtimeMetricMeta.map((metric) => (
                <MetricCard
                  key={metric.key}
                  value={realtimeDam.metrics[metric.key]}
                  label={metric.label}
                />
              ))}
            </div>

            <OpenChannelMonitoring station={channelStation} />
          </div>
        )}

        {view === 'gis' && (
          <div className="dam-monitor-gis">
            <GisMonitoringPanel
              damName={gisDam.name}
              location={gisDam.location}
              latitude={gisDam.latitude}
              longitude={gisDam.longitude}
              reservoirWaterLevel={gisDam.metrics.reservoirWaterLevel}
              headRaceWaterLevel={gisDam.metrics.headRaceWaterLevel}
              tailRaceWaterLevel={gisDam.metrics.tailRaceWaterLevel}
            />
          </div>
        )}

        {view === 'predictions' && (
          <div className="dam-monitor-predictions">
            <ReservoirPredictionPanel dam={realtimeDam} />
          </div>
        )}
      </section>

      {view === 'realtime' && (
        <ParameterTrendCharts dam={realtimeDam} station={channelStation} />
      )}
    </div>
  )
}
