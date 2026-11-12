import { useEffect, useMemo, useState } from 'react'
import { WorkoutList } from './components/WorkoutList'
import { WorkoutDetail } from './components/WorkoutDetail'
import { SongRanking } from './components/SongRanking'
import { SettingsPage } from './components/SettingsPage'
import { demoData } from './lib/demo'
import { getPlays, getSettings, getWorkouts, load, save } from './lib/storage'
import { finishSpotifyLogin, isSpotifyConnected, syncSpotify } from './lib/spotify'
import { finishStravaLogin, isStravaConnected, syncStrava } from './lib/strava'

type Tab = 'workouts' | 'power' | 'heart' | 'settings'
const TABS: [Tab, string][] = [
  ['workouts', 'Workouts'],
  ['power', 'Power songs'],
  ['heart', 'Heart rate'],
  ['settings', 'Settings'],
]

export default function App() {
  const [tab, setTab] = useState<Tab>('workouts')
  const [openId, setOpenId] = useState<string | null>(null)
  const [settings, setSettings] = useState(getSettings)
  const [demo, setDemoState] = useState(() => load('demo', !isSpotifyConnected() && !isStravaConnected()))
  const [version, setVersion] = useState(0)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = () => setVersion((v) => v + 1)
  const setDemo = (d: boolean) => {
    setDemoState(d)
    save('demo', d)
    setOpenId(null)
  }

  // Finish a Spotify or Strava sign-in when they send us back with ?code=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')
    const err = params.get('error')
    if (!code && !err) return
    window.history.replaceState({}, '', window.location.pathname)
    if (err) return setError(`Sign-in was cancelled (${err}).`)
    const finish = state === 'spotify' ? finishSpotifyLogin : state === 'strava' ? finishStravaLogin : null
    if (!finish) return
    finish(code!)
      .then(() => {
        setDemo(false)
        setTab('settings')
        setMessage(`${state === 'spotify' ? 'Spotify' : 'Strava'} connected. Press Sync to pull in your data.`)
        refresh()
      })
      .catch((e) => setError(e.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const data = useMemo(
    () => (demo ? demoData() : { workouts: getWorkouts(), plays: getPlays() }),
    // version forces a re-read after syncing
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [demo, version],
  )

  const sync = async () => {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const parts: string[] = []
      if (isSpotifyConnected()) parts.push(`${await syncSpotify()} new songs`)
      if (isStravaConnected()) parts.push(`${await syncStrava()} workouts with music`)
      setMessage(parts.length ? `Synced: ${parts.join(', ')}.` : 'Connect Spotify and Strava in Settings first.')
      refresh()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const open = data.workouts.find((w) => w.id === openId)

  return (
    <div className="app">
      <header className="top">
        <div className="logo">Tempo</div>
        <nav className="tabs">
          {TABS.map(([id, label]) => (
            <button key={id} className={`tab ${tab === id ? 'active' : ''}`} onClick={() => { setTab(id); setOpenId(null) }}>
              {label}
            </button>
          ))}
        </nav>
        {!demo && (
          <button className="btn" onClick={sync} disabled={busy}>
            {busy ? 'Syncing…' : 'Sync'}
          </button>
        )}
      </header>

      {demo && (
        <div className="banner">
          You're looking at <b>demo data</b>. Connect your accounts in Settings to see your own workouts.
        </div>
      )}
      {error && <div className="error" role="alert">{error}</div>}
      {message && <div className="banner" role="status">{message}</div>}

      {tab === 'workouts' &&
        (open ? (
          <WorkoutDetail workout={open} plays={data.plays} units={settings.units} onBack={() => setOpenId(null)} />
        ) : (
          <WorkoutList workouts={data.workouts} plays={data.plays} units={settings.units} onOpen={setOpenId} />
        ))}
      {tab === 'power' && <SongRanking workouts={data.workouts} plays={data.plays} mode="power" />}
      {tab === 'heart' && <SongRanking workouts={data.workouts} plays={data.plays} mode="heart" />}
      {tab === 'settings' && (
        <SettingsPage
          settings={settings}
          setSettings={setSettings}
          demo={demo}
          setDemo={setDemo}
          onError={setError}
          onChanged={refresh}
        />
      )}
    </div>
  )
}
