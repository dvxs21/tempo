import { segmentsFor } from '../lib/match'
import { formatDate, formatDistance, formatDuration, formatEffort, sportLabel } from '../lib/format'
import type { Play, Settings, Workout } from '../lib/types'

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
        <h2>No workouts with music yet</h2>
        <p className="muted">
          Connect Spotify and Strava in Settings, go for a workout with music on, then press Sync.
          <br />
          Or turn on demo data in Settings to look around first.
        </p>
      </div>
    )
  }

  return (
    <div>
      {withMusic.map(({ w, songs }) => (
        <button key={w.id} className="card workout-row" onClick={() => onOpen(w.id)}>
          <div>
            <div className="small muted">{formatDate(w.start)}</div>
            <h2>{w.name}</h2>
            <span className="pill">{sportLabel[w.sport]}</span>
            <span className="pill">{songs} songs</span>
          </div>
          <div className="stats">
            <div className="stat"><b>{formatDistance(w.distanceM, units)}</b><span>distance</span></div>
            <div className="stat"><b>{formatDuration(w.elapsedSec)}</b><span>time</span></div>
            <div className="stat"><b>{formatEffort(w.avgSpeed, w.sport, units)}</b><span>average</span></div>
          </div>
        </button>
      ))}
      {without > 0 && (
        <p className="small muted">
          {without} other workout{without === 1 ? '' : 's'} had no Spotify plays during them, so they're hidden.
        </p>
      )}
    </div>
  )
}
