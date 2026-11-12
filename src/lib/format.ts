import type { Settings, Sport } from './types'

type Units = Settings['units']
const M_PER_UNIT = { km: 1000, mi: 1609.344 }

/** Runs, walks and hikes are shown as pace (min per km/mi). Rides are shown as speed. */
export const usesPace = (sport: Sport) => sport !== 'ride'

/** minutes per km/mi for a speed in m/s */
export function paceMinutes(v: number, units: Units) {
  return v > 0.3 ? M_PER_UNIT[units] / v / 60 : NaN
}

export function formatPace(v: number, units: Units) {
  const m = paceMinutes(v, units)
  if (!isFinite(m) || m > 60) return '–'
  const whole = Math.floor(m)
  const sec = Math.round((m - whole) * 60)
  return `${sec === 60 ? whole + 1 : whole}:${String(sec === 60 ? 0 : sec).padStart(2, '0')} /${units}`
}

export function formatSpeed(v: number, units: Units) {
  return `${((v * 3600) / M_PER_UNIT[units]).toFixed(1)} ${units === 'km' ? 'km/h' : 'mph'}`
}

export const formatEffort = (v: number, sport: Sport, units: Units) =>
  usesPace(sport) ? formatPace(v, units) : formatSpeed(v, units)

export const formatDistance = (m: number, units: Units) =>
  `${(m / M_PER_UNIT[units]).toFixed(2)} ${units}`

export function formatDuration(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`
}

export const formatDate = (ms: number) =>
  new Date(ms).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })

export const formatPct = (x: number) => `${x >= 0 ? '+' : '−'}${Math.abs(x * 100).toFixed(1)}%`

export const formatBpm = (x: number) => `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(0)} bpm`

export const sportLabel: Record<Sport, string> = {
  run: 'Run',
  ride: 'Ride',
  walk: 'Walk',
  hike: 'Hike',
  other: 'Other',
}
