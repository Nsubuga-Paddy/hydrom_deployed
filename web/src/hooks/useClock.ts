import { useEffect, useState } from 'react'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export interface ClockState {
  day: string
  month: string
  date: number
  year: number
  time: string
}

export function useClock(): ClockState {
  const [clock, setClock] = useState<ClockState>(() => getClockState())

  useEffect(() => {
    const id = window.setInterval(() => setClock(getClockState()), 1000)
    return () => window.clearInterval(id)
  }, [])

  return clock
}

function getClockState(): ClockState {
  const now = new Date()
  return {
    day: DAYS[now.getDay()],
    month: MONTHS[now.getMonth()],
    date: now.getDate(),
    year: now.getFullYear(),
    time: [
      now.getHours().toString().padStart(2, '0'),
      now.getMinutes().toString().padStart(2, '0'),
      now.getSeconds().toString().padStart(2, '0'),
    ].join(':'),
  }
}
