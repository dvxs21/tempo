export function SongArt({ src, name }: { src?: string; name: string }) {
  if (src) return <img className="art" src={src} alt="" loading="lazy" />
  return <div className="art" aria-hidden>{name.slice(0, 1).toUpperCase()}</div>
}

/** A bar growing right (blue) for positive values and left (red) for negative ones. */
export function DivergingBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(50, (Math.abs(value) / max) * 50) : 0
  return (
    <div className="divbar" aria-hidden>
      <div className="axis" />
      <div className={`fill ${value >= 0 ? 'pos' : 'neg'}`} style={{ width: `${pct}%` }} />
    </div>
  )
}
