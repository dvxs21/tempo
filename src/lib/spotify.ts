import { getSettings, load, mergePlays, save, type Tokens } from './storage'
import type { Play } from './types'

// Spotify sign-in uses PKCE, which is designed for apps with no server, so no secret is needed.

const SCOPE = 'user-read-recently-played'
export const redirectUri = () => window.location.origin + window.location.pathname

function randomString(len = 64) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = crypto.getRandomValues(new Uint8Array(len))
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}

async function challengeFor(verifier: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export async function startSpotifyLogin() {
  const { spotifyClientId } = getSettings()
  if (!spotifyClientId) throw new Error('Add your Spotify Client ID in Settings first.')
  const verifier = randomString()
  sessionStorage.setItem('spotify_verifier', verifier)
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: spotifyClientId,
    scope: SCOPE,
    code_challenge_method: 'S256',
    code_challenge: await challengeFor(verifier),
    redirect_uri: redirectUri(),
    state: 'spotify',
  })
  window.location.href = `https://accounts.spotify.com/authorize?${params}`
}

async function tokenRequest(body: Record<string, string>): Promise<Tokens> {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(`Spotify sign-in failed: ${json.error_description ?? json.error}`)
  const old = load<Tokens | null>('spotifyTokens', null)
  const tokens: Tokens = {
    access: json.access_token,
    refresh: json.refresh_token ?? old?.refresh ?? '',
    expiresAt: Date.now() + json.expires_in * 1000 - 60_000,
  }
  save('spotifyTokens', tokens)
  return tokens
}

export async function finishSpotifyLogin(code: string) {
  const verifier = sessionStorage.getItem('spotify_verifier') ?? ''
  sessionStorage.removeItem('spotify_verifier')
  await tokenRequest({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri(),
    client_id: getSettings().spotifyClientId,
    code_verifier: verifier,
  })
}

export const isSpotifyConnected = () => !!load<Tokens | null>('spotifyTokens', null)
export const disconnectSpotify = () => save('spotifyTokens', null)

async function accessToken() {
  const t = load<Tokens | null>('spotifyTokens', null)
  if (!t) throw new Error('Spotify is not connected.')
  if (Date.now() < t.expiresAt) return t.access
  const fresh = await tokenRequest({
    grant_type: 'refresh_token',
    refresh_token: t.refresh,
    client_id: getSettings().spotifyClientId,
  })
  return fresh.access
}

interface RecentItem {
  played_at: string
  track: {
    id: string
    name: string
    duration_ms: number
    artists: { name: string }[]
    album: { images: { url: string; width: number }[] }
  }
}

/**
 * Spotify only remembers your last 50 plays, so this needs to run after every workout.
 * Returns the number of new plays saved.
 */
export async function syncSpotify(): Promise<number> {
  const res = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=50', {
    headers: { Authorization: `Bearer ${await accessToken()}` },
  })
  if (!res.ok) throw new Error(`Spotify sync failed (${res.status})`)
  const json: { items: RecentItem[] } = await res.json()
  const plays: Play[] = json.items.map((i) => {
    const images = [...i.track.album.images].sort((a, b) => a.width - b.width)
    return {
      trackId: i.track.id,
      name: i.track.name,
      artists: i.track.artists.map((a) => a.name).join(', '),
      durationMs: i.track.duration_ms,
      albumArt: (images.find((im) => im.width >= 64) ?? images[0])?.url,
      playedAt: Date.parse(i.played_at),
    }
  })
  return mergePlays(plays)
}
