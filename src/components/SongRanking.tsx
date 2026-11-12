import { useMemo, useState } from 'react'
import { formatBpm, formatPct } from '../lib/format'
import { songStats, type SongStat } from '../lib/stats'
import type { Play, Sport, Workout } from '../lib/types'
import { DivergingBar, SongArt } from './ui'

interface Props {
  workouts: Workout[]
  plays: Play[]
  mode: 'power' | 'heart'
}

export function SongRanking({ workouts, plays, mode }: Props) {
  const [sport, setSport] = useState<Sport | 'all'>('all')
  const [minPlays, setMinPlays] = useState(2)

  const all = useMemo(() => songStats(workouts, plays, sport), [workouts, plays, sport])
  const heart = mode === 'heart'
  const value = (s: SongStat) => (heart ? s.relHr ?? 0 : s.relSpeed)
  const list = all
    .filter((s) => s.count >= minPlays && (!heart || s.relHr !== undefined))
    .sort((a, b) => value(b) - value(a))
  const max = Math.max(heart ? 1 : 0.01, ...list.map((s) => Math.abs(value(s))))
  const hidden = all.length - list.length

  return (
    <div className="card">
      <h2>{heart ? 'Heart rate per song' : 'Power songs'}</h2>
      <p className="small muted">
        {heart
          ? 'How far above or below your workout average your heart rate sits during each song. Top songs pump you up, bottom songs calm you down.'
          : 'Songs ranked by how much faster you go than your average for that workout. Comparing against each workout\'s own average keeps easy and hard days fair.'}
      </p>
      <div className="filters">
        <select value={sport} onChange={(e) => setSport(e.target.value as Sport | 'all')} aria-label="Activity">
          <option value="all">All activities</option>
          <option value="run">Runs</option>
          <option value="ride">Rides</option>
          <option value="walk">Walks</option>
          <option value="hike">Hikes</option>
        </select>
        <select value={minPlays} onChange={(e) => setMinPlays(Number(e.target.value))} aria-label="Minimum plays">
          <option value={1}>Played at least once</option>
          <option value={2}>Played 2+ times</option>
          <option value={3}>Played 3+ times</option>
          <option value={5}>Played 5+ times</option>
        </select>
      </div>

      {!list.length ? (
        <p className="muted empty">
          {heart && all.length && all.every((s) => s.relHr === undefined)
            ? 'None of these workouts have heart-rate data.'
            : 'No songs match yet. Try "Played at least once" or sync more workouts.'}
        </p>
      ) : (
        <ul className="song-list">
          {list.map((s, i) => (
            <li key={s.trackId} className="song">
              <span className="rank">{i + 1}</span>
              <SongArt src={s.albumArt} name={s.name} />
              <div className="song-name">
                <b>{s.name}</b>
                <span>{s.artists}</span>
              </div>
              <DivergingBar value={value(s)} max={max} />
              <div className="value">
                {heart ? formatBpm(value(s)) : formatPct(value(s))}
                <small>
                  {s.count} play{s.count === 1 ? '' : 's'}
                </small>
                {heart && s.hrChange !== undefined && (
                  <small title="Heart-rate change from start to end of the song">
                    {s.hrChange >= 0 ? '↑' : '↓'} {Math.abs(s.hrChange).toFixed(0)} during
                  </small>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {hidden > 0 && <p className="small muted">{hidden} songs hidden by the filters.</p>}
    </div>
  )
}
