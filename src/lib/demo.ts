import type { Play, Sport, Workout } from './types'

// Made-up sample data so the app can be tried before connecting any accounts.
// A few songs secretly make you faster or raise your heart rate, so the stats have
// something real to find.

function rng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const SONGS: [string, string, number, number][] = [
  // name, artist, speed boost, heart-rate boost
  ['Neon Sprint', 'The Velocity Club', 0.07, 6],
  ['Last Mile Home', 'Harbor Lights', 0.05, 4],
  ['Gravity Off', 'Mira Sol', 0.045, 3],
  ['Afterburn', 'KXNG RVN', 0.04, 7],
  ['Concrete Heart', 'Lowtide', 0.02, 2],
  ['Satellite Summer', 'June Avenue', 0.015, 1],
  ['Paper Planes at Dawn', 'Field Notes', 0.005, -1],
  ['Echo Valley', 'Northbound', 0, 0],
  ['Midnight Transit', 'Calla', -0.005, -2],
  ['Slow Burn', 'Ruby Ash', -0.015, -3],
  ['Glass Ocean', 'Tidewater', -0.025, -5],
  ['Sunday Static', 'The Quiet Hours', -0.035, -6],
  ['Feather Light', 'Oona', -0.04, -4],
  ['Rooftop Rain', 'Kite & Key', 0.01, 0],
  ['Pulse Code', 'DVNE', 0.03, 5],
  ['Wide Awake', 'Saint Marlo', 0.025, 2],
  ['Lantern', 'Hollow Pines', -0.02, -2],
  ['Overdrive', 'Static Bloom', 0.055, 8],
]

const BASE: Record<Sport, number> = { run: 2.9, ride: 7.2, walk: 1.45, hike: 1.2, other: 2 }
const PLAN: [Sport, string, number][] = [
  ['run', 'Morning Run', 38],
  ['run', 'Tempo Tuesday', 32],
  ['ride', 'Lunch Ride', 55],
  ['run', 'Easy Recovery Run', 28],
  ['walk', 'Evening Walk', 34],
  ['run', 'Long Run', 62],
  ['hike', 'Trail Hike', 70],
  ['run', 'Interval Session', 35],
  ['ride', 'Weekend Ride', 75],
  ['run', 'Morning Run', 41],
]

export function demoData(): { workouts: Workout[]; plays: Play[] } {
  const r = rng(42)
  const now = new Date()
  now.setHours(7, 0, 0, 0)
  const workouts: Workout[] = []
  const plays: Play[] = []
  const durations = SONGS.map(() => 150_000 + Math.floor(r() * 110_000))

  PLAN.forEach(([sport, name, minutes], i) => {
    const start = now.getTime() - (PLAN.length - i) * 2.1 * 86400_000 + Math.floor(r() * 4) * 3600_000
    const elapsedSec = minutes * 60

    // Queue songs from a couple of minutes before the start until after the end.
    const queue: { song: number; from: number; to: number }[] = []
    let t = start - 120_000
    let last = -1
    while (t < start + elapsedSec * 1000) {
      let song = Math.floor(r() * SONGS.length)
      if (song === last) song = (song + 1) % SONGS.length
      last = song
      // occasionally skip a song after ~40s
      const len = r() < 0.08 ? 40_000 : durations[song]
      queue.push({ song, from: t, to: t + len })
      plays.push({
        trackId: `demo-${song}`,
        name: SONGS[song][0],
        artists: SONGS[song][1],
        durationMs: durations[song],
        playedAt: t + len,
      })
      t += len
    }

    const base = BASE[sport] * (0.95 + r() * 0.1)
    const ts: number[] = []
    const vs: number[] = []
    const hrs: number[] = []
    let hr = 95
    let wobble = 0
    for (let sec = 0; sec <= elapsedSec; sec += 5) {
      const now = start + sec * 1000
      const q = queue.find((x) => now >= x.from && now < x.to)
      const [, , boost, hrBoost] = q ? SONGS[q.song] : [0, 0, 0, 0]
      const warmup = Math.min(1, sec / 300)
      const fatigue = 1 - 0.06 * (sec / elapsedSec)
      const interval = name.startsWith('Interval') && Math.floor(sec / 120) % 2 === 0 ? 0.15 : 0
      wobble = wobble * 0.9 + (r() - 0.5) * 0.04
      const stop = r() < 0.004 ? 0 : 1
      const v = Math.max(0, base * (0.75 + 0.25 * warmup) * fatigue * (1 + boost + interval + wobble) * stop)
      const target = 100 + 60 * (v / BASE[sport]) + hrBoost + 10 * warmup
      hr += (target - hr) * 0.08 + (r() - 0.5) * 1.5
      ts.push(sec)
      vs.push(Math.round(v * 100) / 100)
      hrs.push(Math.round(hr))
    }
    const avgSpeed = vs.reduce((a, b) => a + b, 0) / vs.length
    workouts.push({
      id: `demo-${i}`,
      source: 'demo',
      name,
      sport,
      start,
      elapsedSec,
      distanceM: avgSpeed * elapsedSec,
      avgSpeed,
      avgHr: hrs.reduce((a, b) => a + b, 0) / hrs.length,
      samples: { t: ts, v: vs, hr: hrs },
    })
  })
  return { workouts: workouts.sort((a, b) => b.start - a.start), plays }
}
