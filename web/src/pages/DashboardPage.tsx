import { RealtimeCarousel } from '../components/dashboard/RealtimeCarousel'
import { WaterLevelCarousel } from '../components/dashboard/WaterLevelCarousel'
import { GisCarousel } from '../components/dashboard/GisCarousel'

export function DashboardPage() {
  return (
    <div className="dashboard-page">
      <RealtimeCarousel />
      <WaterLevelCarousel />
      <GisCarousel />
    </div>
  )
}
