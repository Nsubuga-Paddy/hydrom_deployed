import { DamCarousel } from './DamCarousel'
import { WaterLevelChart } from './WaterLevelChart'
import { useDams } from '../../hooks/DamsContext'

export function WaterLevelCarousel() {
  const { realtimeDams, status } = useDams()

  return (
    <section className="panel-card water-level-card">
      <div className="panel-card-left">
        <div className="monitoring-header">
          <h3>Water Level Prediction</h3>
          <div className="white-line" />
        </div>
      </div>
      <div className="panel-card-right">
        {status === 'loading' && realtimeDams.length === 0 && (
          <p className="dam-list-status">Loading dams…</p>
        )}
        {realtimeDams.length > 0 && (
          <DamCarousel length={realtimeDams.length} intervalMs={15000} className="water-level-carousel">
            {realtimeDams.map((dam) => (
              <div key={dam.id} className="water-level-slide-content">
                <h2 className="dam-title">{dam.name} - Water Level Prediction</h2>
                <div className="dam-metrics-graph">
                  <WaterLevelChart baseLevel={dam.chartBaseLevel || 1} />
                </div>
              </div>
            ))}
          </DamCarousel>
        )}
      </div>
    </section>
  )
}
