import { Flame, HeartPulse, Moon } from 'lucide-react'
import { segmentsFor } from '../lib/match'
import { formatDate, formatDistance, formatDuration, formatEffort, formatPct, formatBpm, sportLabel } from '../lib/format'
import { songStats } from '../lib/stats'
import type { Play, Settings, Workout } from '../lib/types'
import { CountUp, SongArt, SportIcon } from './ui'

interface Props {
  workouts: Workout[]
  plays: Play[]
  units: Settings['units']
  onOpenWorkout: (id: string) => void
  onGo: (tab: 'power' | 'heart' | 'workouts' | 'settings') => void
}

export function Home({ workouts, plays, units, onOpenWorkout, onGo }: Props) {
  const withMusic = workouts
    .map((w) => ({ w, segs: segmentsFor(w, plays) }))
    .filter((x) => x.segs.length > 0)

  if (!withMusic.length) {
    return (
      <div className="stagger">
        <section className="hello" style={{ '--i': 0 } as React.CSSProperties}>
          <h1>Which songs make you faster?</h1>
          <p className="lede">Connect your music and Strava, go for a workout with music on, and Tempo lines each song up with your pace.</p>
          <button className="btn pink" onClick={() => onGo('settings')}>Connect Spotify and Strava</button>
        </section>
      </div>
    )
  }

  const twoWeeks = Date.now() - 14 * 86400_000
  const recent = withMusic.filter((x) => x.w.start >= twoWeeks)
  const songsPlayed = recent.reduce((n, x) => n + x.segs.length, 0)
  const minutes = recent.reduce((n, x) => n + x.w.elapsedSec / 60, 0)

  const stats = songStats(workouts, plays).filter((s) => s.count >= 2)
  const power = [...stats].sort((a, b) => b.relSpeed - a.relSpeed)[0]
  const withHr = stats.filter((s) => s.relHr !== undefined)
  const pump = [...withHr].sort((a, b) => (b.relHr ?? 0) - (a.relHr ?? 0))[0]
  const calm = [...withHr].sort((a, b) => (a.relHr ?? 0) - (b.relHr ?? 0))[0]

  const latest = withMusic[0]
  const best = latest.segs.filter((s) => !s.warmup).sort((a, b) => b.relSpeed - a.relSpeed)[0]

  return (
    <div className="stagger home">
      <section className="hello" style={{ '--i': 0 } as React.CSSProperties}>
        <h1>{power ? <>You speed up for <span className="hot">{power.name}</span></> : 'Your workouts, song by song'}</h1>
        <p className="tally">
          Last two weeks: <b><CountUp to={recent.length} /></b> workouts, <b><CountUp to={songsPlayed} delay={350} /></b> songs,{' '}
          <b><CountUp to={minutes} delay={450} /></b> minutes.
        </p>
      </section>

      {power && (
        <button className="card feature" style={{ '--i': 1 } as React.CSSProperties} onClick={() => onGo('power')}>
          <div className="feature-art">
            <SongArt src={power.albumArt} name={power.name} />
          </div>
          <div className="feature-copy">
            <h2>{power.name}</h2>
            <p className="muted">{power.artists}</p>
            <span className="tag" style={{ marginTop: 12 }}><Flame size={15} strokeWidth={2.4} aria-hidden />Your power song</span>
            <p className="big-claim">
              <b>{formatPct(power.relSpeed)}</b> faster than your average, across {power.count} plays
            </p>
            <span className="link">Compare all your songs</span>
          </div>
        </button>
      )}

      <button className="card story" style={{ '--i': 2 } as React.CSSProperties} onClick={() => onOpenWorkout(latest.w.id)}>
        <h2>
          {best && best.relSpeed > 0 ? (
            <>
              <span className="hot">{best.play.name}</span> pushed your {latest.w.name.toLowerCase()} {formatPct(best.relSpeed).replace('+', '')} faster
            </>
          ) : (
            latest.w.name
          )}
        </h2>
        <div className="meta" style={{ margin: '-8px 0 18px' }}>
          <span className="date">Your latest workout · {formatDate(latest.w.start)}</span>
          <span className="pill"><SportIcon sport={latest.w.sport} />{sportLabel[latest.w.sport]}</span>
        </div>
        <div className="stats">
          <div className="stat"><b>{formatDistance(latest.w.distanceM, units)}</b><span>distance</span></div>
          <div className="stat"><b>{formatDuration(latest.w.elapsedSec)}</b><span>time</span></div>
          <div className="stat"><b>{formatEffort(latest.w.avgSpeed, latest.w.sport, units)}</b><span>average</span></div>
          <div className="stat"><b>{latest.segs.length}</b><span>songs</span></div>
        </div>
        <span className="link">Open the pace timeline</span>
      </button>

      {(pump || calm) && (
        <div className="duo" style={{ '--i': 3 } as React.CSSProperties}>
          {pump && (
            <button className="card mini" onClick={() => onGo('heart')}>
              <div className="row mini-song">
                <SongArt src={pump.albumArt} name={pump.name} />
                <div className="song-name"><b>{pump.name}</b><span>{pump.artists}</span></div>
              </div>
              <p className="big-claim small-claim"><b>{formatBpm(pump.relHr ?? 0)}</b> above your average</p>
              <span className="tag" style={{ marginTop: 12 }}><HeartPulse size={15} strokeWidth={2.4} aria-hidden />Pumps you up</span>
            </button>
          )}
          {calm && (
            <button className="card mini" onClick={() => onGo('heart')}>
              <div className="row mini-song">
                <SongArt src={calm.albumArt} name={calm.name} />
                <div className="song-name"><b>{calm.name}</b><span>{calm.artists}</span></div>
              </div>
              <p className="big-claim small-claim"><b>{formatBpm(calm.relHr ?? 0)}</b> below your average</p>
              <span className="tag cool" style={{ marginTop: 12 }}><Moon size={15} strokeWidth={2.4} aria-hidden />Calms you down</span>
            </button>
          )}
        </div>
      )}

      <button className="card wide-link" style={{ '--i': 4 } as React.CSSProperties} onClick={() => onGo('workouts')}>
        Browse all {withMusic.length} workouts with music
      </button>
    </div>
  )
}
