import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { segmentsFor } from '../lib/match'
import {
  formatBpm,
  formatDate,
  formatDistance,
  formatDuration,
  formatEffort,
  formatPct,
  paceMinutes,
  sportLabel,
  usesPace,
} from '../lib/format'
import type { Play, Segment, Settings, Workout } from '../lib/types'
import { DivergingBar, SongArt } from './ui'

interface Props {
  workout: Workout
  plays: Play[]
  units: Settings['units']
  onBack: () => void
}

interface Point {
  min: number
  effort: number | null
  hr: number | null
  sec: number
}

/** 30-second rolling average so the line shows the trend, not GPS jitter. */
function smooth(xs: number[], window = 6) {
  return xs.map((_, i) => {
    const slice = xs.slice(Math.max(0, i - window + 1), i + 1)
    return slice.reduce((a, b) => a + b, 0) / slice.length
  })
}

export function WorkoutDetail({ workout: w, plays, units, onBack }: Props) {
  const [hover, setHover] = useState<number | null>(null)
  const segments = useMemo(() => segmentsFor(w, plays), [w, plays])
  const pace = usesPace(w.sport)

  const data: Point[] = useMemo(() => {
    const s = w.samples
    if (!s) return []
    const v = smooth(s.v)
    const hr = s.hr ? smooth(s.hr) : undefined
    return s.t.map((t, i) => {
      const effort = pace ? paceMinutes(v[i], units) : (v[i] * 3600) / (units === 'km' ? 1000 : 1609.344)
      return {
        sec: t,
        min: t / 60,
        effort: isFinite(effort) && (!pace || effort < 30) ? Math.round(effort * 100) / 100 : null,
        hr: hr ? Math.round(hr[i]) : null,
      }
    })
  }, [w, pace, units])

  const songAt = (sec: number) => segments.find((s) => sec >= s.fromSec && sec <= s.toSec)
  const maxRel = Math.max(0.01, ...segments.filter((s) => !s.warmup).map((s) => Math.abs(s.relSpeed)))
  const hasHr = data.some((d) => d.hr !== null)

  const bands = segments.map((s, i) => (
    <ReferenceArea
      key={i}
      x1={s.fromSec / 60}
      x2={s.toSec / 60}
      fill={hover === i ? 'var(--band-hi)' : i % 2 ? 'transparent' : 'var(--band)'}
      fillOpacity={1}
      ifOverflow="hidden"
    />
  ))

  const tooltip = (kind: 'effort' | 'hr') =>
    function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload?: Point }[] }) {
      const p = payload?.[0]?.payload
      if (!active || !p) return null
      const seg = songAt(p.sec)
      const value =
        kind === 'hr'
          ? p.hr !== null ? `${p.hr} bpm` : '–'
          : p.effort === null
            ? 'stopped'
            : pace
              ? `${Math.floor(p.effort)}:${String(Math.round((p.effort % 1) * 60)).padStart(2, '0')} /${units}`
              : `${p.effort.toFixed(1)} ${units === 'km' ? 'km/h' : 'mph'}`
      return (
        <div className="tooltip">
          <b>{value}</b>
          <span className="muted">{formatDuration(p.sec)} in</span>
          {seg && <div>♪ {seg.play.name}</div>}
        </div>
      )
    }

  const axisProps = {
    tick: { fill: 'var(--text-3)', fontSize: 12 },
    stroke: 'var(--border)',
  }

  const onMove = (e: { activeLabel?: string | number } | null) => {
    if (e?.activeLabel === undefined) return setHover(null)
    const idx = segments.findIndex((s) => Number(e.activeLabel) * 60 >= s.fromSec && Number(e.activeLabel) * 60 <= s.toSec)
    setHover(idx >= 0 ? idx : null)
  }

  return (
    <div>
      <button className="back" onClick={onBack}>← All workouts</button>
      <div className="card">
        <div className="small muted">{formatDate(w.start)} · {sportLabel[w.sport]}</div>
        <h2>{w.name}</h2>
        <div className="stats" style={{ marginTop: 8 }}>
          <div className="stat"><b>{formatDistance(w.distanceM, units)}</b><span>distance</span></div>
          <div className="stat"><b>{formatDuration(w.elapsedSec)}</b><span>time</span></div>
          <div className="stat"><b>{formatEffort(w.avgSpeed, w.sport, units)}</b><span>average</span></div>
          {w.avgHr && <div className="stat"><b>{Math.round(w.avgHr)} bpm</b><span>avg heart rate</span></div>}
          <div className="stat"><b>{segments.length}</b><span>songs</span></div>
        </div>

        <div className="chart-title">
          {pace ? `Pace (min/${units}, faster is higher)` : `Speed (${units === 'km' ? 'km/h' : 'mph'})`} · shaded stripes are songs
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} syncId="workout" margin={{ top: 8, right: 8, bottom: 0, left: -8 }} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            {bands}
            <XAxis dataKey="min" type="number" domain={[0, w.elapsedSec / 60]} unit=" min" {...axisProps} tickFormatter={(m) => Math.round(m).toString()} />
            <YAxis reversed={pace} domain={['auto', 'auto']} width={44} {...axisProps} tickFormatter={(v) => (pace ? `${Math.floor(v)}:${String(Math.round((v % 1) * 60)).padStart(2, '0')}` : String(v))} />
            <Tooltip content={tooltip('effort')} cursor={{ stroke: 'var(--text-3)' }} />
            <Line dataKey="effort" stroke="var(--accent)" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>

        {hasHr && (
          <>
            <div className="chart-title">Heart rate (bpm)</div>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={data} syncId="workout" margin={{ top: 8, right: 8, bottom: 0, left: -8 }} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                {bands}
                <XAxis dataKey="min" type="number" domain={[0, w.elapsedSec / 60]} unit=" min" {...axisProps} tickFormatter={(m) => Math.round(m).toString()} />
                <YAxis domain={['auto', 'auto']} width={44} {...axisProps} />
                <Tooltip content={tooltip('hr')} cursor={{ stroke: 'var(--text-3)' }} />
                <Line dataKey="hr" stroke="var(--hr)" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </>
        )}

        <h3>Songs in this workout</h3>
        <p className="small muted" style={{ marginTop: -4 }}>
          Bar shows how much faster (blue) or slower (red) you went than your average for this workout.
        </p>
        <ul className="song-list">
          {segments.map((s: Segment, i) => (
            <li key={i} className={`song ${hover === i ? 'hi' : ''}`} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <span className="rank">{formatDuration(s.fromSec)}</span>
              <SongArt src={s.play.albumArt} name={s.play.name} />
              <div className="song-name">
                <b>{s.play.name}</b>
                <span>{s.warmup ? 'Warm-up · not counted in rankings' : s.play.artists}</span>
              </div>
              <DivergingBar value={s.warmup ? 0 : s.relSpeed} max={maxRel} />
              <div className="value">
                {s.warmup ? '–' : formatPct(s.relSpeed)}
                <small>{formatEffort(s.avgSpeed, w.sport, units)}</small>
                {s.relHr !== undefined && <small>{formatBpm(s.relHr)}</small>}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
