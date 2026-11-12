import type { Play, Settings, Workout } from './types'

// Everything lives in this browser's localStorage. Nothing is sent anywhere except
// Spotify and Strava themselves.

const PREFIX = 'tempo:'

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function save(key: string, value: unknown) {
  try {
    if (value === undefined || value === null) localStorage.removeItem(PREFIX + key)
    else localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch (e) {
    console.warn('Could not save', key, e)
  }
}

export const defaultSettings: Settings = {
  units: 'km',
  spotifyClientId: '',
  stravaClientId: '',
  stravaClientSecret: '',
}

export const getSettings = () => ({ ...defaultSettings, ...load<Partial<Settings>>('settings', {}) })
export const saveSettings = (s: Settings) => save('settings', s)

export const getPlays = () => load<Play[]>('plays', [])
/** Adds new plays to the saved history, skipping duplicates. Returns how many were new. */
export function mergePlays(incoming: Play[]): number {
  const existing = getPlays()
  const seen = new Set(existing.map((p) => `${p.playedAt}|${p.trackId}`))
  const fresh = incoming.filter((p) => !seen.has(`${p.playedAt}|${p.trackId}`))
  save('plays', [...existing, ...fresh].sort((a, b) => a.playedAt - b.playedAt))
  return fresh.length
}

export const getWorkouts = () => load<Workout[]>('workouts', [])
export function mergeWorkouts(incoming: Workout[]) {
  const map = new Map(getWorkouts().map((w) => [w.id, w]))
  for (const w of incoming) map.set(w.id, { ...map.get(w.id), ...w })
  save('workouts', [...map.values()].sort((a, b) => b.start - a.start))
}

export interface Tokens {
  access: string
  refresh: string
  /** ms since epoch */
  expiresAt: number
}
