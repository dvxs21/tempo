import { ChevronRight, Music2 } from 'lucide-react'
import { segmentsFor } from '../lib/match'
import { formatDate, formatDistance, formatDuration, formatEffort, sportLabel } from '../lib/format'
import type { Play, Settings, Workout } from '../lib/types'
import { SportIcon } from './ui'

interface Props {
  workouts: Workout[]
  plays: Play[]
  units: Settings['units']
  onOpen: (id: string) => void
}

export function WorkoutList({ workouts, plays, units, onOpen }: Props) {
  const rows = workouts.map((w) => ({ w, songs: segmentsFor(w, plays).length }))
  const withMusic = rows.filter((r) => r.songs > 0)
  const without = rows.length - withMusic.length

  if (!withMusic.length) {
    return (
      <div className="card empty">
        <div className="art"><Music2 aria-hidden /></div>
        <h2>No workouts with music yet</h2>
        <p className="muted">
          Connect your music and Strava in Settings, go for a workout with music on, then press Sync.
          <br />
          Or turn on demo data in Settings to look around first.
        </p>
      </div>
    )
  }

  return (
    <div>
      {withMusic.map(({ w, songs }, i) => (
        <button
          key={w.id}
          className="card workout-row"
          style={{ '--i': i } as React.CSSProperties}
          onClick={() => onOpen(w.id)}
        >
          <div>
            <h2>{w.name}</h2>
            <div className="meta">
              <span className="date">{formatDate(w.start)}</span>
              <span className="pill"><SportIcon sport={w.sport} />{sportLabel[w.sport]}</span>
              <span className="pill hot"><Music2 size={13} strokeWidth={2.4} aria-hidden />{songs} songs</span>
            </div>
          </div>
          <div className="row" style={{ gap: 18 }}>
            <div className="stats">
              <div className="stat"><b>{formatDistance(w.distanceM, units)}</b><span>distance</span></div>
              <div className="stat"><b>{formatDuration(w.elapsedSec)}</b><span>time</span></div>
              <div className="stat"><b>{formatEffort(w.avgSpeed, w.sport, units)}</b><span>average</span></div>
            </div>
            <ChevronRight className="go" size={22} aria-hidden />
          </div>
        </button>
      ))}
      {without > 0 && (
        <p className="small muted" style={{ '--i': withMusic.length } as React.CSSProperties}>
          {without} other workout{without === 1 ? '' : 's'} had no music playing during them, so they're hidden.
        </p>
      )}
    </div>
  )
}
