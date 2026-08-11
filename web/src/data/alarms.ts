import type { AlarmPreview } from './dams'
import { alarmPreviews } from './dams'

export type AlarmStatus = 'active' | 'acknowledged' | 'watching'

export interface SystemAlarm extends AlarmPreview {
  status: AlarmStatus
  source: string
  parameter: string
  threshold: string
  currentValue: string
  action: string
  damId: string
}

const damIdsByName: Record<string, string> = {
  'Nalubaale HPP': 'nalubaale',
  'Kiira HPP': 'kiira',
  'Bujagali HPP': 'bujagali',
}

const alarmDetails: Record<
  string,
  Pick<SystemAlarm, 'source' | 'parameter' | 'threshold' | 'currentValue' | 'action' | 'status'>
> = {
  '1': {
    source: 'Reservoir sensor',
    parameter: 'Reservoir water level',
    threshold: 'Normal range exceeded',
    currentValue: '1134 m',
    action: 'Verify reservoir trend and notify operations.',
    status: 'active',
  },
  '2': {
    source: 'Reservoir monitoring',
    parameter: 'Active volume',
    threshold: 'Watch range',
    currentValue: 'Above expected',
    action: 'Keep under observation for next interval.',
    status: 'watching',
  },
  '3': {
    source: 'Prediction service',
    parameter: 'Water level trend',
    threshold: 'Approaching critical',
    currentValue: 'Rising',
    action: 'Check forecast drivers and open-channel flow.',
    status: 'active',
  },
}

const extraAlarms: SystemAlarm[] = [
  {
    id: '4',
    dam: 'Isimba HPP',
    damId: 'isimba',
    message: 'Tail-race flow rising faster than expected.',
    time: '12 min ago',
    severity: 'info',
    status: 'watching',
    source: 'Open-channel station',
    parameter: 'Flow',
    threshold: '300 m³/s watch',
    currentValue: '350 m³/s',
    action: 'Continue monitoring inflow trend.',
  },
  {
    id: '5',
    dam: 'Bujagali HPP',
    damId: 'bujagali',
    message: 'Forecast confidence dropped below target range.',
    time: '18 min ago',
    severity: 'warning',
    status: 'acknowledged',
    source: 'Prediction service',
    parameter: 'Forecast confidence',
    threshold: '85% minimum',
    currentValue: '82%',
    action: 'Review upstream and rainfall inputs.',
  },
]

export function getSystemAlarms(): SystemAlarm[] {
  const previewAlarms = alarmPreviews.map((alarm) => ({
    ...alarm,
    damId: damIdsByName[alarm.dam] ?? 'bujagali',
    ...alarmDetails[alarm.id],
  }))

  return [...previewAlarms, ...extraAlarms]
}

/** Unresolved notifications shown on the bell badge. */
export function getUnreadAlarmCount(alarms = getSystemAlarms()): number {
  return alarms.filter((alarm) => alarm.status !== 'acknowledged').length
}
