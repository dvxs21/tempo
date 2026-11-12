import { useState } from 'react'
import { redirectUri, startSpotifyLogin, disconnectSpotify, isSpotifyConnected } from '../lib/spotify'
import { startStravaLogin, disconnectStrava, isStravaConnected } from '../lib/strava'
import { saveSettings, save } from '../lib/storage'
import type { Settings } from '../lib/types'

interface Props {
  settings: Settings
  setSettings: (s: Settings) => void
  demo: boolean
  setDemo: (d: boolean) => void
  onError: (msg: string) => void
  onChanged: () => void
  onImported: (msg: string) => void
}

export function SettingsPage({ settings, setSettings, demo, setDemo, onError, onChanged, onImported }: Props) {
  const [draft, setDraft] = useState(settings)
  const [importing, setImporting] = useState(false)
  const importFile = async (file: File | undefined) => {
    if (!file) return
    setImporting(true)
    try {
      // The zip reader only downloads when someone imports a file.
      const { importAppleMusic } = await import('../lib/applemusic')
      const r = await importAppleMusic(file)
      onImported(
        r.added
          ? `Imported ${r.added} Apple Music plays${r.kept < r.found ? ` (of ${r.found}, keeping only ones near your workouts)` : ''}.`
          : `No new plays: all ${r.kept} were already saved.`,
      )
    } catch (e) {
      onError((e as Error).message)
    } finally {
      setImporting(false)
    }
  }
  const update = (patch: Partial<Settings>) => {
    const next = { ...draft, ...patch }
    setDraft(next)
    setSettings(next)
    saveSettings(next)
  }
  const spotifyOn = isSpotifyConnected()
  const stravaOn = isStravaConnected()
  const uri = redirectUri()
  const host = window.location.hostname

  const run = (fn: () => unknown) => {
    try {
      const r = fn()
      if (r instanceof Promise) r.catch((e) => onError(String(e.message ?? e)))
    } catch (e) {
      onError(String((e as Error).message ?? e))
    }
  }

  return (
    <div>
      <div className="card" style={{ '--i': 0 } as React.CSSProperties}>
        <h2>General</h2>
        <label className="field">
          <span>Units</span>
          <select value={draft.units} onChange={(e) => update({ units: e.target.value as Settings['units'] })}>
            <option value="km">Kilometres</option>
            <option value="mi">Miles</option>
          </select>
        </label>
        <label className="row">
          <input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} />
          Show demo data instead of my own
        </label>
      </div>

      <div className="card" style={{ '--i': 1 } as React.CSSProperties}>
        <h2>Apple Music</h2>
        <p className="lede">Apple doesn't let web apps read your listening history directly, but you can download it from Apple and drop the file in here.</p>
        <details>
          <summary className="small">How to get the file (Apple takes a few days)</summary>
          <ol className="steps small">
            <li>Go to <a href="https://privacy.apple.com" target="_blank" rel="noreferrer">privacy.apple.com</a>, sign in, and choose <b>Request a copy of your data</b>.</li>
            <li>Tick <b>Apple Media Services information</b> and submit.</li>
            <li>When Apple emails you, download the zip. Choose it below as it is, or unzip it and pick <b>Apple Music Play Activity.csv</b>.</li>
          </ol>
          <p className="lede">The file is read on this device. Nothing is uploaded.</p>
        </details>
        <label className={`btn file-btn ${importing ? 'busy' : ''}`}>
          <input type="file" accept=".csv,.zip,text/csv,application/zip" disabled={importing} onChange={(e) => { importFile(e.target.files?.[0]); e.target.value = '' }} />
          {importing ? 'Reading your history…' : 'Choose Apple Music file'}
        </label>
      </div>

      <div className="card" style={{ '--i': 2 } as React.CSSProperties}>
        <h2>Spotify {spotifyOn && <span className="pill">Connected</span>}</h2>
        <p className="lede">Spotify only remembers your last 50 songs, so open this app and press Sync after each workout.</p>
        <details>
          <summary className="small">One-time setup (about 3 minutes)</summary>
          <ol className="steps small">
            <li>Go to <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer">developer.spotify.com/dashboard</a> and press <b>Create app</b>.</li>
            <li>Give it any name and description. Tick <b>Web API</b>.</li>
            <li>Under Redirect URIs, add exactly: <code>{uri}</code></li>
            <li>Save, open the app's settings, and copy the <b>Client ID</b> into the box below.</li>
          </ol>
        </details>
        <label className="field">
          <span>Spotify Client ID</span>
          <input value={draft.spotifyClientId} onChange={(e) => update({ spotifyClientId: e.target.value.trim() })} placeholder="e.g. 3f1c…" />
        </label>
        <div className="row">
          {spotifyOn ? (
            <button className="btn secondary" onClick={() => { disconnectSpotify(); onChanged() }}>Disconnect</button>
          ) : (
            <button className="btn" disabled={!draft.spotifyClientId} onClick={() => run(startSpotifyLogin)}>Connect Spotify</button>
          )}
        </div>
      </div>

      <div className="card" style={{ '--i': 3 } as React.CSSProperties}>
        <h2>Strava {stravaOn && <span className="pill">Connected</span>}</h2>
        <p className="lede">
          Apple Watch workouts can come in through Strava too: in the Strava app, go to Settings → Applications, Services and Devices → Health, and turn on syncing.
        </p>
        <details>
          <summary className="small">One-time setup (about 3 minutes)</summary>
          <ol className="steps small">
            <li>Go to <a href="https://www.strava.com/settings/api" target="_blank" rel="noreferrer">strava.com/settings/api</a> and create an app.</li>
            <li>Any name and category. Website can be anything.</li>
            <li>Set <b>Authorization Callback Domain</b> to: <code>{host}</code></li>
            <li>Copy the <b>Client ID</b> and <b>Client Secret</b> into the boxes below.</li>
          </ol>
          <p className="lede">The secret stays in this browser only. It's your own private Strava app, so this is fine for personal use.</p>
        </details>
        <label className="field">
          <span>Strava Client ID</span>
          <input value={draft.stravaClientId} onChange={(e) => update({ stravaClientId: e.target.value.trim() })} placeholder="e.g. 123456" />
        </label>
        <label className="field">
          <span>Strava Client Secret</span>
          <input type="password" value={draft.stravaClientSecret} onChange={(e) => update({ stravaClientSecret: e.target.value.trim() })} />
        </label>
        <div className="row">
          {stravaOn ? (
            <button className="btn secondary" onClick={() => { disconnectStrava(); onChanged() }}>Disconnect</button>
          ) : (
            <button className="btn" disabled={!draft.stravaClientId || !draft.stravaClientSecret} onClick={() => run(startStravaLogin)}>Connect Strava</button>
          )}
        </div>
      </div>

      <div className="card" style={{ '--i': 4 } as React.CSSProperties}>
        <h2>Your data</h2>
        <p className="lede">Everything is stored only in this browser. Clearing it removes saved songs and workouts (not your accounts).</p>
        <button
          className="btn secondary"
          onClick={() => {
            if (confirm('Delete all saved songs and workouts from this browser?')) {
              save('plays', null)
              save('workouts', null)
              onChanged()
            }
          }}
        >
          Clear saved data
        </button>
      </div>
    </div>
  )
}
