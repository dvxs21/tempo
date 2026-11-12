import { getPlays, getSettings, getWorkouts, load, mergeWorkouts, save, type Tokens } from './storage'
import { redirectUri } from './spotify'
import { playWindow } from './match'
import type { Samples, Sport, Workout } from './types'

// Strava doesn't support secret-free sign-in, so for personal use the Client Secret from
// YOUR OWN Strava API app is kept in this browser only. Before going public, this exchange
// should move to a tiny server (e.g. a free Cloudflare Worker) so the secret isn't in the browser.

export function startStravaLogin() {
  const { stravaClientId } = getSettings()
  if (!stravaClientId) throw new Error('Add your Strava Client ID in Settings first.')
  const params = new URLSearchParams({
    client_id: stravaClientId,
    redirect_uri: redirectUri(),
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'activity:read_all',
    state: 'strava',
  })
  window.location.href = `https://www.strava.com/oauth/authorize?${params}`
}

async function tokenRequest(body: Record<string, string>): Promise<Tokens> {
  const { stravaClientId, stravaClientSecret } = getSettings()
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: stravaClientId, client_secret: stravaClientSecret, ...body }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(`Strava sign-in failed: ${json.message ?? res.status}`)
  const tokens: Tokens = {
    access: json.access_token,
    refresh: json.refresh_token,
    expiresAt: json.expires_at * 1000 - 60_000,
  }
  save('stravaTokens', tokens)
  return tokens
}

export const finishStravaLogin = (code: string) =>
  tokenRequest({ code, grant_type: 'authorization_code' })
export const isStravaConnected = () => !!load<Tokens | null>('stravaTokens', null)
export const disconnectStrava = () => save('stravaTokens', null)

async function accessToken() {
  const t = load<Tokens | null>('stravaTokens', null)
  if (!t) throw new Error('Strava is not connected.')
  if (Date.now() < t.expiresAt) return t.access
  return (await tokenRequest({ grant_type: 'refresh_token', refresh_token: t.refresh })).access
}

async function api<T>(path: string): Promise<T> {
  const res = await fetch(`https://www.strava.com/api/v3${path}`, {
    headers: { Authorization: `Bearer ${await accessToken()}` },
  })
  if (res.status === 429) throw new Error('Strava rate limit hit. Try again in 15 minutes.')
  if (!res.ok) throw new Error(`Strava request failed (${res.status})`)
  return res.json()
}

function toSport(t: string): Sport {
  if (/run/i.test(t)) return 'run'
  if (/ride|cycl|bike/i.test(t)) return 'ride'
  if (/hike/i.test(t)) return 'hike'
  if (/walk/i.test(t)) return 'walk'
  return 'other'
}

interface StravaActivity {
  id: number
  name: string
  sport_type?: string
  type: string
  start_date: string
  elapsed_time: number
  distance: number
  average_speed: number
  average_heartrate?: number
}

type Streams = Partial<Record<'time' | 'velocity_smooth' | 'heartrate', { data: number[] }>>

/** Keep roughly one point every 5 seconds so a year of workouts fits in browser storage. */
function downsample(s: Streams): Samples | undefined {
  const t = s.time?.data
  const v = s.velocity_smooth?.data
  if (!t || !v) return undefined
  const hr = s.heartrate?.data
  const out: Samples = { t: [], v: [], hr: hr ? [] : undefined }
  let last = -Infinity
  for (let i = 0; i < t.length; i++) {
    if (t[i] - last < 5 && i !== t.length - 1) continue
    last = t[i]
    out.t.push(t[i])
    out.v.push(Math.round(v[i] * 100) / 100)
    if (hr && out.hr) out.hr.push(hr[i])
  }
  return out
}

/**
 * Pulls your recent Strava activities. Detailed streams are only downloaded for
 * workouts that overlap songs you played, to stay well inside Strava's rate limits.
 * Returns the number of workouts that got song data.
 */
export async function syncStrava(pages = 2): Promise<number> {
  const activities: StravaActivity[] = []
  for (let page = 1; page <= pages; page++) {
    const batch = await api<StravaActivity[]>(`/athlete/activities?per_page=50&page=${page}`)
    activities.push(...batch)
    if (batch.length < 50) break
  }
  const existing = new Map(getWorkouts().map((w) => [w.id, w]))
  const plays = getPlays()
  const workouts: Workout[] = []
  let withStreams = 0

  for (const a of activities) {
    const sport = toSport(a.sport_type ?? a.type)
    const w: Workout = {
      id: `strava-${a.id}`,
      source: 'strava',
      name: a.name,
      sport,
      start: Date.parse(a.start_date),
      elapsedSec: a.elapsed_time,
      distanceM: a.distance,
      avgSpeed: a.average_speed,
      avgHr: a.average_heartrate,
      samples: existing.get(`strava-${a.id}`)?.samples,
    }
    const end = w.start + w.elapsedSec * 1000
    const hasMusic = plays.some((p) => {
      const [from, to] = playWindow(p)
      return from < end && to > w.start
    })
    if (hasMusic && !w.samples && sport !== 'other') {
      const streams = await api<Streams>(
        `/activities/${a.id}/streams?keys=time,velocity_smooth,heartrate&key_by_type=true`,
      )
      w.samples = downsample(streams)
    }
    if (w.samples && hasMusic) withStreams++
    workouts.push(w)
  }
  mergeWorkouts(workouts)
  return withStreams
}
