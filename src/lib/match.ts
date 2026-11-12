import type { Play, Segment, Workout } from './types'

/** Songs that overlap a workout by less than this are ignored. */
const MIN_OVERLAP_SEC = 30
/**
 * Everyone is slower while warming up, so the first minutes are left out of the workout
 * average, and songs that mostly play during them don't count towards rankings.
 */
export const WARMUP_SEC = 300

/**
 * Spotify logs a play when the song ends (or is skipped), so a song roughly ran from
 * (playedAt - duration) to playedAt.
 */
export function playWindow(p: Play): [number, number] {
  return [p.playedAt - p.durationMs, p.playedAt]
}

/**
 * Lines every song up against the workout's recorded data.
 * If a song was skipped early, its start is clamped to the previous song's end.
 */
export function segmentsFor(w: Workout, plays: Play[]): Segment[] {
  const s = w.samples
  if (!s || s.t.length < 2) return []
  const wEnd = w.start + w.elapsedSec * 1000
  const sorted = [...plays].sort((a, b) => a.playedAt - b.playedAt)

  // Baseline = average after warm-up (falls back to everything for very short workouts).
  let base = s.t.map((_, i) => i).filter((i) => s.t[i] >= WARMUP_SEC)
  if (base.length < 10) base = s.t.map((_, i) => i)
  const wAvgSpeed = mean(base.map((i) => s.v[i]))
  const wAvgHr = s.hr ? mean(base.map((i) => s.hr![i])) : undefined

  const out: Segment[] = []
  let prevEnd = -Infinity
  for (const p of sorted) {
    let [from, to] = playWindow(p)
    from = Math.max(from, prevEnd)
    prevEnd = to
    if (to <= w.start || from >= wEnd) continue

    const fromSec = Math.max(0, (from - w.start) / 1000)
    const toSec = Math.min(w.elapsedSec, (to - w.start) / 1000)
    if (toSec - fromSec < MIN_OVERLAP_SEC) continue

    const idx: number[] = []
    s.t.forEach((t, i) => t >= fromSec && t <= toSec && idx.push(i))
    if (idx.length < 2) continue

    const avgSpeed = mean(idx.map((i) => s.v[i]))
    const seg: Segment = {
      play: p,
      fromSec,
      toSec,
      avgSpeed,
      relSpeed: wAvgSpeed > 0 ? avgSpeed / wAvgSpeed - 1 : 0,
      warmup: (fromSec + toSec) / 2 < WARMUP_SEC && w.elapsedSec > WARMUP_SEC * 2,
    }
    if (s.hr && wAvgHr) {
      const hr = idx.map((i) => s.hr![i])
      seg.avgHr = mean(hr)
      seg.relHr = seg.avgHr - wAvgHr
      const k = Math.min(3, Math.floor(hr.length / 2))
      seg.hrChange = mean(hr.slice(-k)) - mean(hr.slice(0, k))
    }
    out.push(seg)
  }
  return out
}

export function mean(xs: number[]) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0
}
