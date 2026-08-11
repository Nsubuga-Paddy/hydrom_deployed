import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCloudSunRain,
  faLocationDot,
  faSatelliteDish,
  faWater,
} from '@fortawesome/free-solid-svg-icons'
import {
  formatWeatherValue,
  openStreetMapEmbedUrl,
} from '../../api/openMeteo'
import { useOpenMeteo } from '../../hooks/useOpenMeteo'
import { MetricCard } from './MetricCard'
import { WaterLevelMetricCard } from './WaterLevelMetricCard'

interface GisMonitoringPanelProps {
  damName: string
  location?: string
  latitude?: number | null
  longitude?: number | null
  reservoirWaterLevel: string
  headRaceWaterLevel: string | null
  tailRaceWaterLevel: string | null
  compact?: boolean
}

export function GisMonitoringPanel({
  damName,
  location,
  latitude,
  longitude,
  reservoirWaterLevel,
  headRaceWaterLevel,
  tailRaceWaterLevel,
  compact = false,
}: GisMonitoringPanelProps) {
  const hasCoordinates =
    latitude != null &&
    longitude != null &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude)
  const { weather, status, error, refresh } = useOpenMeteo(latitude, longitude)

  const temperature = formatWeatherValue(weather?.temperatureC, '°C')
  const humidity = formatWeatherValue(weather?.humidityPercent, '%', 0)
  const precipitation = formatWeatherValue(weather?.precipitationMm, ' mm')
  const wind = formatWeatherValue(weather?.windSpeedKmh, ' km/h')

  return (
    <div className={`gis-panel${compact ? ' compact' : ''}`}>
      <div className="gis-panel-main">
        <div className="gis-panel-section">
          <div className="gis-section-header">
            <span>
              <FontAwesomeIcon icon={faWater} />
              Station-measured water levels
            </span>
            <small>From Hydro-M sensors at the dam</small>
          </div>
          <div className="gis-station-grid">
            <WaterLevelMetricCard
              reservoir={reservoirWaterLevel}
              headRace={headRaceWaterLevel}
              tailRace={tailRaceWaterLevel}
              label="Station water level"
            />
          </div>
        </div>

        <div className="gis-panel-section">
          <div className="gis-section-header">
            <span>
              <FontAwesomeIcon icon={faCloudSunRain} />
              Remote weather (Open-Meteo)
            </span>
            <small>
              {hasCoordinates
                ? `${latitude!.toFixed(4)}, ${longitude!.toFixed(4)}`
                : 'GPS coordinates needed in admin'}
            </small>
          </div>

          {!hasCoordinates && (
            <p className="gis-panel-note">
              Set latitude and longitude for {damName} in Django admin to load location weather.
            </p>
          )}

          {hasCoordinates && status === 'loading' && (
            <p className="gis-panel-note">Loading Open-Meteo weather…</p>
          )}

          {hasCoordinates && status === 'error' && (
            <div className="gis-panel-note error">
              <p>{error || 'Unable to load Open-Meteo weather.'}</p>
              <button type="button" onClick={refresh}>
                Retry
              </button>
            </div>
          )}

          {hasCoordinates && (status === 'ready' || status === 'loading') && (
            <div className="gis-weather-grid">
              <MetricCard value={temperature} label="Temperature" />
              <MetricCard value={humidity} label="Humidity" />
              <MetricCard value={precipitation} label="Precipitation" />
              <MetricCard value={wind} label="Wind speed" />
            </div>
          )}

          {weather?.updatedAt && (
            <p className="gis-weather-meta">
              <FontAwesomeIcon icon={faSatelliteDish} />
              Open-Meteo current conditions · updated {weather.updatedAt.replace('T', ' ')}
            </p>
          )}
        </div>
      </div>

      <aside className="gis-map-card">
        <div className="gis-section-header">
          <span>
            <FontAwesomeIcon icon={faLocationDot} />
            Location map
          </span>
          <small>{location || damName}</small>
        </div>

        {hasCoordinates ? (
          <>
            <iframe
              title={`${damName} map`}
              className="gis-map-frame"
              src={openStreetMapEmbedUrl(latitude!, longitude!)}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <p className="gis-map-coords">
              {latitude!.toFixed(5)}, {longitude!.toFixed(5)}
            </p>
          </>
        ) : (
          <div className="gis-map-empty">
            <p>Map unavailable until GPS coordinates are set for this dam.</p>
          </div>
        )}
      </aside>
    </div>
  )
}
