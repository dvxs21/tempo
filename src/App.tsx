import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Settings2 } from 'lucide-react'
import { Landscape } from './components/Landscape'
import { Equalizer } from './components/ui'
import { Dock, type Tab } from './components/Dock'
import { Home } from './components/Home'
import { WorkoutList } from './components/WorkoutList'
// Charts are the heaviest part of the app, so they load only when a workout is opened.
const WorkoutDetail = lazy(() => import('./components/WorkoutDetail').then((m) => ({ default: m.WorkoutDetail })))
import { SongRanking } from './components/SongRanking'
import { SettingsPage } from './components/SettingsPage'
import { demoData } from './lib/demo'
import { getPlays, getSettings, getWorkouts, load, save } from './lib/storage'
import { finishSpotifyLogin, isSpotifyConnected, syncSpotify } from './lib/spotify'
import { finishStravaLogin, isStravaConnected, syncStrava } from './lib/strava'


export default function App() {
  const [tab, setTab] = useState<Tab>('home')
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

  const sync = async (prefix?: string) => {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const parts: string[] = []
      if (isSpotifyConnected()) parts.push(`${await syncSpotify()} new songs`)
      if (isStravaConnected()) parts.push(`${await syncStrava()} workouts with music`)
      setMessage(
        (prefix ? prefix + ' ' : '') +
          (parts.length ? `Synced: ${parts.join(', ')}.` : 'Connect your music and Strava in Settings first.'),
      )
      refresh()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const open = data.workouts.find((w) => w.id === openId)
  const go = (t: Tab) => {
    setTab(t)
    setOpenId(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="app">
      <Landscape />
      <header className="top">
        <button className="logo" onClick={() => go('home')} aria-label="Tempo home"><Equalizer />Tempo</button>
        {demo && (
          <button className="chip" onClick={() => go('settings')} title="Connect your accounts to see your own workouts">
            Demo data
          </button>
        )}
        <button className={`icon-btn ${tab === 'settings' ? 'active' : ''}`} onClick={() => go('settings')} aria-label="Settings">
          <Settings2 size={20} strokeWidth={2.2} aria-hidden />
        </button>
      </header>

      {error && <div className="error" role="alert"><AlertCircle size={18} aria-hidden />{error}</div>}
      {message && <div className="banner" role="status"><CheckCircle2 size={18} aria-hidden />{message}</div>}

      <main className="view" key={`${tab}-${openId ?? ''}-${demo}`}>
      {tab === 'home' && (
        <Home
          workouts={data.workouts}
          plays={data.plays}
          units={settings.units}
          onOpenWorkout={(id) => { setTab('workouts'); setOpenId(id) }}
          onGo={go}
        />
      )}
      {tab === 'workouts' &&
        (open ? (
          <Suspense fallback={<div className="card loading" aria-busy="true">Loading workout…</div>}>
            <WorkoutDetail workout={open} plays={data.plays} units={settings.units} onBack={() => setOpenId(null)} />
          </Suspense>
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
          onImported={(msg) => {
            setDemo(false)
            setMessage(isStravaConnected() ? msg : `${msg} Connect Strava to line them up with your workouts.`)
            refresh()
            // Fetch pace data for workouts that now have music.
            if (isStravaConnected()) sync(msg)
          }}
        />
      )}
      </main>
      <Dock tab={tab} onTab={go} demo={demo} busy={busy} onSync={() => sync()} />
    </div>
  )
}
