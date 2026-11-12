import { unzipSync } from 'fflate'
import { getPlays, getWorkouts, mergePlays } from './storage'
import type { Play } from './types'

// Apple Music has no public listening-history API for web apps, but Apple's privacy
// export (privacy.apple.com → "Apple Media Services information") contains
// "Apple Music Play Activity.csv" with a timestamp for every play. Column names have
// changed between export years, so every column is looked up by several names.

const COLS = {
  start: ['event start timestamp', 'play start timestamp'],
  end: ['event end timestamp', 'play end timestamp'],
  eventTs: ['event timestamp', 'event received timestamp'],
  song: ['song name', 'content name', 'track name', 'title'],
  artist: ['artist name', 'container artist name', 'artist'],
  description: ['item description', 'track description'],
  playMs: ['play duration milliseconds', 'play duration in milliseconds'],
  mediaMs: ['media duration in milliseconds', 'media duration milliseconds'],
  eventType: ['event type'],
  trackId: ['apple id number', 'song id', 'track identifier', 'item reference'],
} as const

/** Songs played for less than this are skips, not listens. */
const MIN_PLAY_MS = 30_000
/** Without any saved workouts, keep this much recent history. */
const RECENT_DAYS = 120

export interface ImportResult {
  found: number
  kept: number
  added: number
}

/** Reads a .csv, or a .zip (including Apple's zips-inside-a-zip), and saves the plays. */
export async function importAppleMusic(file: File): Promise<ImportResult> {
  const csv = /\.zip$/i.test(file.name) ? findCsvInZip(new Uint8Array(await file.arrayBuffer())) : await file.text()
  if (!csv) throw new Error('Could not find "Apple Music Play Activity.csv" in that file.')
  const plays = parsePlayActivity(csv)
  if (!plays.length) throw new Error('No song plays found in that file. Is it "Apple Music Play Activity.csv"?')

  // localStorage only holds a few MB, and years of history can be far more. Keep only
  // songs that could line up with a workout.
  const workouts = getWorkouts()
  const margin = 10 * 60_000
  const kept = workouts.length
    ? plays.filter((p) =>
        workouts.some((w) => p.playedAt > w.start - margin && p.playedAt - p.durationMs < w.start + w.elapsedSec * 1000 + margin),
      )
    : plays.filter((p) => p.playedAt > Date.now() - RECENT_DAYS * 86400_000)

  const before = getPlays().length
  const added = mergePlays(kept)
  if (getPlays().length < before + added) throw new Error('Your browser ran out of storage space for these songs.')
  return { found: plays.length, kept: kept.length, added }
}

function findCsvInZip(bytes: Uint8Array, depth = 0): string | null {
  const files = unzipSync(bytes, {
    filter: (f) => /play activity\.csv$/i.test(f.name) || (depth < 3 && /\.zip$/i.test(f.name)),
  })
  for (const [name, data] of Object.entries(files)) {
    if (/play activity\.csv$/i.test(name)) return new TextDecoder().decode(data)
  }
  for (const [name, data] of Object.entries(files)) {
    if (/\.zip$/i.test(name)) {
      const found = findCsvInZip(data, depth + 1)
      if (found) return found
    }
  }
  return null
}

export function parsePlayActivity(csv: string): Play[] {
  const rows = parseCsv(csv)
  const header = rows.shift()?.map((h) => h.trim().toLowerCase()) ?? []
  const col = (names: readonly string[]) => {
    for (const n of names) {
      const i = header.indexOf(n)
      if (i >= 0) return i
    }
    return -1
  }
  const c = Object.fromEntries(Object.entries(COLS).map(([k, names]) => [k, col(names)])) as Record<keyof typeof COLS, number>
  if (c.song < 0 && c.description < 0) return []
  if (c.start < 0 && c.end < 0 && c.eventTs < 0) return []

  const out: Play[] = []
  for (const r of rows) {
    const get = (i: number) => (i >= 0 ? (r[i] ?? '').trim() : '')
    const type = get(c.eventType).toUpperCase()
    if (type && type !== 'PLAY_END') continue

    let name = get(c.song)
    let artists = get(c.artist)
    if (!name) {
      // "Artist - Song" in older exports
      const d = get(c.description)
      const cut = d.indexOf(' - ')
      if (cut > 0) [artists, name] = [d.slice(0, cut), d.slice(cut + 3)]
      else name = d
    }
    if (!name) continue

    const playMs = Number(get(c.playMs)) || 0
    const mediaMs = Number(get(c.mediaMs)) || 0
    const start = Date.parse(get(c.start))
    const end = Date.parse(get(c.end))
    const ts = Date.parse(get(c.eventTs))
    let listened = playMs
    let playedAt: number
    if (Number.isFinite(end)) {
      playedAt = end
      if (!listened && Number.isFinite(start)) listened = end - start
    } else if (Number.isFinite(start)) {
      playedAt = start + (listened || mediaMs)
    } else if (Number.isFinite(ts)) {
      playedAt = ts
    } else continue
    if (!listened) listened = mediaMs
    if (listened < MIN_PLAY_MS) continue

    const id = get(c.trackId)
    out.push({
      trackId: id ? `am-${id}` : `am-${artists}|${name}`.toLowerCase(),
      name,
      artists: artists || 'Unknown artist',
      // The window used for matching is what was actually listened to.
      durationMs: Math.min(listened, mediaMs || listened),
      playedAt,
    })
  }
  return out.sort((a, b) => a.playedAt - b.playedAt)
}

/** Small RFC 4180 CSV parser: quoted fields, escaped quotes, newlines inside quotes. */
function parseCsv(text: string): string[][] {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else quoted = false
      } else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') { row.push(field); field = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.length > 1 || row[0]) rows.push(row)
      row = []
    } else field += ch
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  return rows
}
