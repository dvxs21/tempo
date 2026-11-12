import { mean, segmentsFor } from './match'
import type { Play, Sport, Workout } from './types'

export interface SongStat {
  trackId: string
  name: string
  artists: string
  albumArt?: string
  /** how many workout plays this is based on */
  count: number
  /** average speed vs the workout's average: +0.05 = 5% faster */
  relSpeed: number
  /** average bpm above/below the workout's average heart rate */
  relHr?: number
  /** average bpm change from the start to the end of the song */
  hrChange?: number
}

/**
 * Compares songs fairly across different workouts by measuring each one against the
 * average of the workout it was played in. That way a song isn't "fast" just because it
 * came on during an easy ride versus a hard run.
 */
export function songStats(workouts: Workout[], plays: Play[], sport: Sport | 'all' = 'all'): SongStat[] {
  const byTrack = new Map<string, { play: Play; rel: number[]; relHr: number[]; hrChange: number[] }>()
  for (const w of workouts) {
    if (sport !== 'all' && w.sport !== sport) continue
    for (const seg of segmentsFor(w, plays)) {
      if (seg.warmup) continue
      const e = byTrack.get(seg.play.trackId) ?? { play: seg.play, rel: [], relHr: [], hrChange: [] }
      e.rel.push(seg.relSpeed)
      if (seg.relHr !== undefined) e.relHr.push(seg.relHr)
      if (seg.hrChange !== undefined) e.hrChange.push(seg.hrChange)
      byTrack.set(seg.play.trackId, e)
    }
  }
  return [...byTrack.values()].map(({ play, rel, relHr, hrChange }) => ({
    trackId: play.trackId,
    name: play.name,
    artists: play.artists,
    albumArt: play.albumArt,
    count: rel.length,
    relSpeed: mean(rel),
    relHr: relHr.length ? mean(relHr) : undefined,
    hrChange: hrChange.length ? mean(hrChange) : undefined,
  }))
}
