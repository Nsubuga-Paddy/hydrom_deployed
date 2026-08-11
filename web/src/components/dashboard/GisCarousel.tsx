import { DamCarousel } from './DamCarousel'
import { GisMonitoringPanel } from './GisMonitoringPanel'
import { useDams } from '../../hooks/DamsContext'

export function GisCarousel() {
  const { dams, getGisDam, status } = useDams()
  const gisSlides = dams
    .map((dam) => getGisDam(dam.id))
    .filter((dam): dam is NonNullable<typeof dam> => Boolean(dam))

  return (
    <section className="panel-card gis-card">
      <div className="panel-card-left">
        <div className="monitoring-header">
          <h3>GIS Monitoring</h3>
          <div className="white-line" />
          <p className="gis-left-note">Station levels + Open-Meteo weather</p>
        </div>
      </div>
      <div className="panel-card-right">
        {status === 'loading' && gisSlides.length === 0 && (
          <p className="dam-list-status">Loading dams…</p>
        )}
        {gisSlides.length > 0 && (
          <DamCarousel length={gisSlides.length} intervalMs={18000} className="gis-carousel">
            {gisSlides.map((dam) => (
              <div key={dam.id} className="gis-slide-content">
                <h2 className="dam-title">{dam.name} - GIS</h2>
                <GisMonitoringPanel
                  damName={dam.name}
                  location={dam.location}
                  latitude={dam.latitude}
                  longitude={dam.longitude}
                  reservoirWaterLevel={dam.metrics.reservoirWaterLevel}
                  headRaceWaterLevel={dam.metrics.headRaceWaterLevel}
                  tailRaceWaterLevel={dam.metrics.tailRaceWaterLevel}
                  compact
                />
              </div>
            ))}
          </DamCarousel>
        )}
      </div>
    </section>
  )
}
