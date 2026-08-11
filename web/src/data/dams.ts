import { NO_DATA_AVAILABLE } from './display'

export interface DamMetrics {
  reservoirWaterLevel: string
  headRaceWaterLevel: string | null
  tailRaceWaterLevel: string | null
  dispatch: string
  discharge: string
  humidity: string
  temperature: string
  precipitation: string
}

export interface GisMetrics {
  /** Station-measured levels from Hydro-M sensors */
  reservoirWaterLevel: string
  headRaceWaterLevel: string | null
  tailRaceWaterLevel: string | null
  /** Remote weather filled by Open-Meteo on the GIS panel */
  precipitation: string
  humidity: string
  temperature: string
  windSpeed?: string
  latitude?: number | null
  longitude?: number | null
  weatherSource?: string
}

export interface DamRealtime {
  id: string
  name: string
  location?: string
  timestamp?: string | null
  metrics: DamMetrics
  chartBaseLevel: number
}

/** Open-channel sensor station linked to a dam (API-ready). */
export interface ChannelStation {
  id: string
  damId: string
  name: string
  location: string
  distanceFromTailRace: string
  metrics: {
    stage: string
    velocity: string
    flow: string
  }
}

export interface DamGis {
  id: string
  name: string
  location?: string
  latitude?: number | null
  longitude?: number | null
  metrics: GisMetrics
}

export interface CascadeDam {
  id: string
  name: string
  location?: string
  latitude?: number | null
  longitude?: number | null
  reservoirWaterLevel: string
  headRaceWaterLevel: string | null
  tailRaceWaterLevel: string | null
  dispatch?: string
  discharge?: string
  featured?: boolean
}

export interface AlarmPreview {
  id: string
  dam: string
  message: string
  time: string
  severity: 'critical' | 'warning' | 'info'
}

export type DamViewMode = 'realtime' | 'gis' | 'predictions'

export const damViewModes: { id: DamViewMode; label: string }[] = [
  { id: 'realtime', label: 'Real-time' },
  { id: 'gis', label: 'GIS' },
  { id: 'predictions', label: 'Predictions' },
]

export const DEFAULT_DAM_ID = 'kiira'

export function createRealtimePlaceholder(damId: string, name?: string): DamRealtime {
  return {
    id: damId,
    name: name || damId,
    timestamp: null,
    chartBaseLevel: 0,
    metrics: {
      reservoirWaterLevel: NO_DATA_AVAILABLE,
      headRaceWaterLevel: null,
      tailRaceWaterLevel: null,
      dispatch: NO_DATA_AVAILABLE,
      discharge: NO_DATA_AVAILABLE,
      humidity: NO_DATA_AVAILABLE,
      temperature: NO_DATA_AVAILABLE,
      precipitation: NO_DATA_AVAILABLE,
    },
  }
}

/** @deprecated Prefer useDams() — kept only as offline placeholders during migration. */
export const realtimeDams: DamRealtime[] = [
  {
    id: 'nalubaale',
    name: 'Lake Nalubaale',
    chartBaseLevel: 1134,
    metrics: {
      reservoirWaterLevel: '1134.2 m',
      headRaceWaterLevel: null,
      tailRaceWaterLevel: null,
      dispatch: '—',
      discharge: '510 m³/s',
      humidity: '80%',
      temperature: '25°C',
      precipitation: '6mm',
    },
  },
  {
    id: 'bujagali',
    name: 'Bujagali',
    chartBaseLevel: 700,
    metrics: {
      reservoirWaterLevel: '700.1 m',
      headRaceWaterLevel: null,
      tailRaceWaterLevel: null,
      dispatch: '—',
      discharge: '380 m³/s',
      humidity: '75%',
      temperature: '28°C',
      precipitation: '5mm',
    },
  },
  {
    id: 'kiira',
    name: 'Kiira',
    chartBaseLevel: 720,
    metrics: {
      reservoirWaterLevel: '720.3 m',
      headRaceWaterLevel: null,
      tailRaceWaterLevel: null,
      dispatch: '—',
      discharge: '420 m³/s',
      humidity: '78%',
      temperature: '26°C',
      precipitation: '3mm',
    },
  },
  {
    id: 'isimba',
    name: 'Isimba',
    chartBaseLevel: 680,
    metrics: {
      reservoirWaterLevel: '680.0 m',
      headRaceWaterLevel: null,
      tailRaceWaterLevel: null,
      dispatch: '—',
      discharge: '350 m³/s',
      humidity: '72%',
      temperature: '30°C',
      precipitation: '8mm',
    },
  },
]

export const channelStations: ChannelStation[] = [
  {
    id: 'nalubaale-channel',
    damId: 'nalubaale',
    name: 'Nalubaale open-channel station',
    location: 'Jinja Pier outflow channel',
    distanceFromTailRace: '~120 m downstream of tail race',
    metrics: {
      stage: '1.42 m',
      velocity: '1.8 m/s',
      flow: '510 m³/s',
    },
  },
  {
    id: 'bujagali-channel',
    damId: 'bujagali',
    name: 'Bujagali open-channel station',
    location: 'Bujagali tail-race channel, Jinja',
    distanceFromTailRace: '~150 m downstream of tail race',
    metrics: {
      stage: '1.28 m',
      velocity: '2.1 m/s',
      flow: '380 m³/s',
    },
  },
  {
    id: 'kiira-channel',
    damId: 'kiira',
    name: 'Kiira open-channel station',
    location: 'Kiira outflow channel, Jinja',
    distanceFromTailRace: '~140 m downstream of tail race',
    metrics: {
      stage: '1.35 m',
      velocity: '1.9 m/s',
      flow: '420 m³/s',
    },
  },
  {
    id: 'isimba-channel',
    damId: 'isimba',
    name: 'Isimba open-channel station',
    location: 'Isimba tail-race channel, Kayunga',
    distanceFromTailRace: '~160 m downstream of tail race',
    metrics: {
      stage: '1.18 m',
      velocity: '1.7 m/s',
      flow: '350 m³/s',
    },
  },
]

export const gisDams: DamGis[] = [
  {
    id: 'nalubaale',
    name: 'Lake Nalubaale',
    metrics: {
      reservoirWaterLevel: '1134.2 m',
      headRaceWaterLevel: null,
      tailRaceWaterLevel: null,
      precipitation: '6mm',
      humidity: '80%',
      temperature: '25°C',
    },
  },
  {
    id: 'bujagali',
    name: 'Bujagali',
    metrics: {
      reservoirWaterLevel: '700.1 m',
      headRaceWaterLevel: null,
      tailRaceWaterLevel: null,
      precipitation: '5mm',
      humidity: '75%',
      temperature: '28°C',
    },
  },
  {
    id: 'kiira',
    name: 'Kiira',
    metrics: {
      reservoirWaterLevel: '720.3 m',
      headRaceWaterLevel: null,
      tailRaceWaterLevel: null,
      precipitation: '3mm',
      humidity: '78%',
      temperature: '26°C',
    },
  },
  {
    id: 'isimba',
    name: 'Isimba',
    metrics: {
      reservoirWaterLevel: '680.0 m',
      headRaceWaterLevel: null,
      tailRaceWaterLevel: null,
      precipitation: '8mm',
      humidity: '72%',
      temperature: '30°C',
    },
  },
]

export const cascadeDams: CascadeDam[] = [
  {
    id: 'nalubaale',
    name: 'Lake Nalubaale',
    location: 'Jinja Pier',
    reservoirWaterLevel: '1134.2 m',
    headRaceWaterLevel: null,
    tailRaceWaterLevel: null,
    featured: true,
  },
  {
    id: 'bujagali',
    name: 'Bujagali HPP',
    location: 'Jinja',
    reservoirWaterLevel: '700.1 m',
    headRaceWaterLevel: null,
    tailRaceWaterLevel: null,
    discharge: '380 m³/s',
  },
  {
    id: 'kiira',
    name: 'Kiira HPP',
    location: 'Jinja',
    reservoirWaterLevel: '720.3 m',
    headRaceWaterLevel: null,
    tailRaceWaterLevel: null,
    discharge: '420 m³/s',
  },
  {
    id: 'isimba',
    name: 'Isimba HPP',
    location: 'Kayunga',
    reservoirWaterLevel: '680.0 m',
    headRaceWaterLevel: null,
    tailRaceWaterLevel: null,
    discharge: '350 m³/s',
  },
]

export function getRealtimeDam(damId?: string | null): DamRealtime {
  return realtimeDams.find((dam) => dam.id === damId) ?? createRealtimePlaceholder(damId || 'unknown')
}

export function getGisDam(damId?: string | null): DamGis {
  const found = gisDams.find((dam) => dam.id === damId)
  if (found) return found
  const placeholder = createRealtimePlaceholder(damId || 'unknown')
  return {
    id: placeholder.id,
    name: placeholder.name,
    latitude: null,
    longitude: null,
    metrics: {
      reservoirWaterLevel: placeholder.metrics.reservoirWaterLevel,
      headRaceWaterLevel: placeholder.metrics.headRaceWaterLevel,
      tailRaceWaterLevel: placeholder.metrics.tailRaceWaterLevel,
      precipitation: '-',
      humidity: '-',
      temperature: '-',
      windSpeed: '-',
      weatherSource: 'Open-Meteo',
    },
  }
}

export function getCascadeDam(damId?: string | null): CascadeDam {
  return (
    cascadeDams.find((dam) => dam.id === damId) ?? {
      id: damId || 'unknown',
      name: damId || 'Unknown dam',
      reservoirWaterLevel: NO_DATA_AVAILABLE,
      headRaceWaterLevel: null,
      tailRaceWaterLevel: null,
    }
  )
}

export function getChannelStation(damId?: string | null): ChannelStation {
  return channelStations.find((station) => station.damId === damId) ?? channelStations[0]
}

export function resolveDamView(view?: string | null): DamViewMode {
  if (view === 'gis' || view === 'predictions' || view === 'realtime') return view
  return 'realtime'
}

export function damPath(damId: string, view: DamViewMode = 'realtime') {
  return `/dams/${damId}/${view}`
}

export const alarmPreviews: AlarmPreview[] = [
  {
    id: '1',
    dam: 'Nalubaale HPP',
    message: 'The water level has passed the normal and expected level.',
    time: '2 min ago',
    severity: 'critical',
  },
  {
    id: '2',
    dam: 'Kiira HPP',
    message: 'Reservoir past active volume just as expected.',
    time: '5 min ago',
    severity: 'warning',
  },
  {
    id: '3',
    dam: 'Bujagali HPP',
    message: 'Water level approaching critical threshold.',
    time: '8 min ago',
    severity: 'warning',
  },
]

export const navLinks = [
  { to: '/', label: 'Dashboard' },
  { to: '/download-data', label: 'Download Data' },
  { to: '/system-generated-reports', label: 'SGR', fullLabel: 'System Generated Reports' },
  { to: '/contact-us', label: 'Contact Us' },
] as const

export const monitoringCategories = [
  { to: '/realtime', label: 'Real-time', icon: 'clock' as const },
  { to: '/gis', label: 'GIS Monitoring', icon: 'map-marker-alt' as const },
  { to: '/predictions', label: 'Predictions', icon: 'chart-line' as const },
] as const
