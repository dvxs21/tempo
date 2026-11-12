import { useEffect } from 'react'

/**
 * The fixed sky backdrop: you're above the clouds.
 * Banks of cloud drift endlessly below (each its own speed), puffs float past, the
 * horizon glows pink, and a pink contrail crosses the sky. Layers also drift up at
 * different speeds as the page scrolls (parallax) via one --scroll custom property.
 */

const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
}

/**
 * A scalloped cloud-bank outline, 1440 wide, repeated twice (2880) so it can drift
 * left forever without a seam.
 */
function bank(seed: number, baseY: number, bumpW: number, amp: number) {
  const r = rng(seed)
  const bumps: [number, number][] = []
  let x = 0
  while (x < 1440) {
    let w = bumpW * (0.6 + 0.8 * r())
    if (1440 - x - w < bumpW * 0.5) w = 1440 - x
    bumps.push([w, amp * (0.55 + 0.9 * r())])
    x += w
  }
  let d = `M0 900 L0 ${baseY}`
  for (let rep = 0; rep < 2; rep++)
    for (const [w, h] of bumps) d += ` a ${w / 2} ${h} 0 0 1 ${w} 0`
  return d + ' L2880 900 Z'
}

const CONTRAIL = 'M-60 520 C 220 470, 420 300, 720 280 S 1180 210, 1520 120'

export function Landscape() {
  useEffect(() => {
    if (reduced()) return
    let last = -1
    let raf = 0
    const tick = () => {
      const y = Math.min(window.scrollY, 900)
      if (y !== last) {
        last = y
        document.documentElement.style.setProperty('--scroll', `${y}px`)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const still = reduced()

  return (
    <div className="landscape" aria-hidden>
      <svg className="sky" viewBox="0 0 1440 900" preserveAspectRatio="none">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1373cc" />
            <stop offset="0.3" stopColor="#3a9be6" />
            <stop offset="0.55" stopColor="#86c8f5" />
            <stop offset="0.7" stopColor="#cfe9fc" />
            <stop offset="0.8" stopColor="#ffd2e8" />
            <stop offset="1" stopColor="#ffb8da" />
          </linearGradient>
        </defs>
        <rect width="1440" height="900" fill="url(#sky)" />
      </svg>

      {/* sun + glow */}
      <Layer offset={0.02} rise={30}>
        <defs>
          <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ffe6f2" />
            <stop offset="0.3" stopColor="#ff7ab8" stopOpacity="0.55" />
            <stop offset="1" stopColor="#ff7ab8" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#ff9fcf" />
          </linearGradient>
        </defs>
        <g className="sun">
          <circle cx="1080" cy="560" r="340" fill="url(#glow)" />
          <circle cx="1080" cy="560" r="80" fill="url(#sun)" />
        </g>
      </Layer>

      {/* pink contrail with a little plane-dot flying along it */}
      <Layer offset={0.04} rise={0}>
        <path className="contrail" d={CONTRAIL} fill="none" stroke="#ff2d87" strokeWidth="4" strokeLinecap="round" strokeDasharray="1 14" opacity="0.8" />
        {!still && (
          <g>
            <circle r="6" fill="#ff2d87" stroke="#fff" strokeWidth="3">
              <animateMotion dur="26s" repeatCount="indefinite" path={CONTRAIL} />
            </circle>
          </g>
        )}
      </Layer>

      {/* floating puffs */}
      <Layer offset={0.06} rise={0}>
        <defs>
          <filter id="soft" x="-30%" y="-60%" width="160%" height="220%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
          <linearGradient id="puff" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#ffe1ef" />
          </linearGradient>
        </defs>
        <Puff x={180} y={170} s={1} cls="puff-a" />
        <Puff x={760} y={110} s={0.7} cls="puff-b" />
        <Puff x={1240} y={250} s={0.85} cls="puff-c" />
        <Puff x={460} y={360} s={0.55} cls="puff-d" />
      </Layer>

      {/* cloud banks, far to near; each drifts left on its own loop */}
      <Bank offset={0.08} rise={60} speed="far" d={bank(7, 650, 150, 34)} top="#ffe9f4" bottom="#ffcbe4" />
      <Bank offset={0.14} rise={90} speed="mid" d={bank(21, 720, 200, 48)} top="#ffffff" bottom="#d9ecfb" />
      <Bank offset={0.2} rise={120} speed="near" d={bank(42, 790, 250, 60)} top="#ffffff" bottom="#e6f2fd" shade />
      <Bank offset={0.28} rise={150} speed="front" d={bank(99, 850, 300, 56)} top="#ffffff" bottom="#f4f9ff" shade />
    </div>
  )
}

function Puff({ x, y, s, cls }: { x: number; y: number; s: number; cls: string }) {
  return (
    <g className={`puff ${cls}`}>
      <g transform={`translate(${x} ${y}) scale(${s})`} filter="url(#soft)" fill="url(#puff)">
        <circle cx="0" cy="0" r="46" />
        <circle cx="52" cy="-18" r="58" />
        <circle cx="112" cy="-2" r="44" />
        <circle cx="150" cy="14" r="30" />
        <rect x="-30" y="0" width="210" height="44" rx="22" />
      </g>
    </g>
  )
}

function Bank({
  offset,
  rise,
  speed,
  d,
  top,
  bottom,
  shade,
}: {
  offset: number
  rise: number
  speed: string
  d: string
  top: string
  bottom: string
  shade?: boolean
}) {
  const id = `bank-${speed}`
  return (
    <Layer offset={offset} rise={rise}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="1" stopColor={bottom} />
        </linearGradient>
      </defs>
      <g className={`bank bank-${speed}`}>
        {shade && <path d={d} fill="#a9cdee" opacity="0.35" transform="translate(0 -6)" />}
        <path d={d} fill={`url(#${id})`} />
      </g>
    </Layer>
  )
}

function Layer({ offset, rise, children }: { offset: number; rise: number; children: React.ReactNode }) {
  return (
    <div className="layer" style={{ '--offset': offset } as React.CSSProperties}>
      <svg
        className="layer-art"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMax slice"
        style={{ '--rise': `${rise}px` } as React.CSSProperties}
      >
        {children}
      </svg>
    </div>
  )
}
