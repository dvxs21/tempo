export type Sport = 'run' | 'ride' | 'walk' | 'hike' | 'other'

/** Second-by-second (or downsampled) data recorded during a workout. */
export interface Samples {
  /** seconds since workout start */
  t: number[]
  /** speed in metres per second */
  v: number[]
  /** heart rate in bpm, same length as t (may be missing) */
  hr?: number[]
}

export interface Workout {
  id: string
  source: 'strava' | 'demo'
  name: string
  sport: Sport
  /** start time, ms since epoch */
  start: number
  elapsedSec: number
  distanceM: number
  avgSpeed: number
  avgHr?: number
  samples?: Samples
}

/** One play of a song, from Spotify or an Apple Music export. */
export interface Play {
  trackId: string
  name: string
  artists: string
  durationMs: number
  albumArt?: string
  /** When the song ended or was skipped (ms since epoch). */
  playedAt: number
}

/** A song lined up against a stretch of a workout. */
export interface Segment {
  play: Play
  /** seconds since workout start */
  fromSec: number
  toSec: number
  avgSpeed: number
  /** this segment's speed relative to the workout average: +0.05 = 5% faster */
  relSpeed: number
  /** mostly played during the warm-up, so left out of song rankings */
  warmup: boolean
  avgHr?: number
  /** heart-rate difference vs the workout average, in bpm */
  relHr?: number
  /** heart-rate change from start to end of the song, in bpm */
  hrChange?: number
}

export interface Settings {
  units: 'km' | 'mi'
  spotifyClientId: string
  stravaClientId: string
  stravaClientSecret: string
}
