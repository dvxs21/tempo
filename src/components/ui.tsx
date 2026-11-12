import { useEffect, useState } from 'react'
import { Bike, Footprints, Mountain, PersonStanding, Activity } from 'lucide-react'

/** Counts up from 0 to `to` with an ease-out curve. */
export function useCountUp(to: number, ms = 1200, delay = 250) {
  const [v, setV] = useState(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ? to : 0,
  )
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return setV(to)
    let raf = 0
    const start = performance.now() + delay
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / ms))
      setV(to * (1 - Math.pow(1 - t, 4)))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to, ms, delay])
  return v
}

export function CountUp({ to, decimals = 0, delay }: { to: number; decimals?: number; delay?: number }) {
  const v = useCountUp(to, 1200, delay)
  return <>{v.toFixed(decimals)}</>
}
import type { Sport } from '../lib/types'

export function SongArt({ src, name }: { src?: string; name: string }) {
  if (src) return <img className="art" src={src} alt="" loading="lazy" />
  return <div className="art" aria-hidden>{name.slice(0, 1).toUpperCase()}</div>
}

/** Bar growing right (pink, faster) or left (pale sky, slower) from a centre axis. */
export function DivergingBar({ value, max, index = 0 }: { value: number; max: number; index?: number }) {
  const pct = max > 0 ? Math.min(50, (Math.abs(value) / max) * 50) : 0
  return (
    <div className="divbar" aria-hidden>
      <div className="axis" />
      <div
        className={`fill ${value >= 0 ? 'pos' : 'neg'}`}
        style={{ width: `${pct}%`, '--i': index } as React.CSSProperties}
      />
    </div>
  )
}

const ICONS = { run: Footprints, ride: Bike, hike: Mountain, walk: PersonStanding, other: Activity }

export function SportIcon({ sport, size = 14 }: { sport: Sport; size?: number }) {
  const Icon = ICONS[sport]
  return <Icon size={size} strokeWidth={2.2} aria-hidden />
}

/** Animated equalizer bars beside the logo. */
export function Equalizer() {
  return (
    <span className="eq" aria-hidden>
      <i />
      <i />
      <i />
      <i />
    </span>
  )
}
