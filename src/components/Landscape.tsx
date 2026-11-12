import { useEffect } from 'react'

/**
 * The fixed, layered sky-and-hills backdrop.
 * Far layers are pale and pink-hazed, near layers deep blue (atmospheric perspective).
 * Each layer drifts up at its own speed as the page scrolls (parallax), using one
 * --scroll custom property written from a single requestAnimationFrame loop.
 */

const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// The winding running trail across the near hills, reused for the moving "runner" dot.
const TRAIL =
  'M-40 812 C 160 790, 260 744, 420 752 S 700 820, 880 790 S 1160 700, 1300 716 S 1460 760, 1500 752'

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
            <stop offset="0" stopColor="#1a7fd4" />
            <stop offset="0.32" stopColor="#3b9be6" />
            <stop offset="0.58" stopColor="#7cc2f3" />
            <stop offset="0.74" stopColor="#c7e7fb" />
            <stop offset="0.88" stopColor="#ffd6ea" />
            <stop offset="1" stopColor="#ffc4e0" />
          </linearGradient>
        </defs>
        <rect width="1440" height="900" fill="url(#sky)" />
      </svg>

      <Layer offset={0.02} rise={40}>
        <defs>
          <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ffe3f0" stopOpacity="1" />
            <stop offset="0.35" stopColor="#ff8cc4" stopOpacity="0.55" />
            <stop offset="1" stopColor="#ff8cc4" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#ff9fcf" />
          </linearGradient>
        </defs>
        <g className="sun">
          <circle cx="1060" cy="560" r="300" fill="url(#glow)" />
          <circle cx="1060" cy="560" r="74" fill="url(#sun)" />
        </g>
      </Layer>

      <Layer offset={0.03} rise={0} className="clouds">
        <defs>
          <filter id="soft" x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
        </defs>
        <g className="cloud cloud-a" filter="url(#soft)" fill="#ffffff" opacity="0.55">
          <ellipse cx="260" cy="210" rx="150" ry="34" />
          <ellipse cx="330" cy="188" rx="90" ry="34" />
        </g>
        <g className="cloud cloud-b" filter="url(#soft)" fill="#ffffff" opacity="0.4">
          <ellipse cx="900" cy="150" rx="190" ry="30" />
          <ellipse cx="980" cy="132" rx="100" ry="30" />
        </g>
        <g className="cloud cloud-c" filter="url(#soft)" fill="#ffe6f2" opacity="0.45">
          <ellipse cx="560" cy="330" rx="130" ry="22" />
        </g>
      </Layer>

      <Layer offset={0.05} rise={60}>
        <defs>
          <linearGradient id="far" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#b3dbf8" />
            <stop offset="1" stopColor="#f5d9ee" />
          </linearGradient>
        </defs>
        <path
          d="M0 640 L120 580 L210 610 L330 520 L450 600 L560 560 L700 610 L820 540 L930 590 L1060 500 L1190 590 L1300 550 L1440 600 L1440 900 L0 900 Z"
          fill="url(#far)"
        />
      </Layer>

      <Layer offset={0.09} rise={80}>
        <defs>
          <linearGradient id="midfar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#86c3f1" />
            <stop offset="1" stopColor="#b8dcf6" />
          </linearGradient>
        </defs>
        <path
          d="M0 700 C 180 640, 320 640, 480 680 S 780 720, 940 664 S 1240 620, 1440 670 L1440 900 L0 900 Z"
          fill="url(#midfar)"
        />
      </Layer>

      <Layer offset={0.14} rise={110}>
        <defs>
          <linearGradient id="mid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#4fa2e6" />
            <stop offset="1" stopColor="#7ab9ec" />
          </linearGradient>
        </defs>
        <path
          d="M0 760 C 220 700, 380 690, 560 730 S 900 790, 1080 730 S 1340 690, 1440 712 L1440 900 L0 900 Z"
          fill="url(#mid)"
        />
      </Layer>

      <Layer offset={0.2} rise={140}>
        <defs>
          <linearGradient id="near" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2a80d2" />
            <stop offset="1" stopColor="#1a68b8" />
          </linearGradient>
        </defs>
        <path
          d="M0 800 C 200 760, 300 730, 440 744 S 720 812, 900 784 S 1180 700, 1320 712 S 1420 740, 1440 744 L1440 900 L0 900 Z"
          fill="url(#near)"
        />
        <path className="trail" d={TRAIL} fill="none" stroke="#ff2d87" strokeWidth="5" strokeLinecap="round" strokeDasharray="2 16" opacity="0.85" />
        {!still && (
          <circle r="7" fill="#ff2d87" stroke="#ffffff" strokeWidth="3">
            <animateMotion dur="38s" repeatCount="indefinite" path={TRAIL} />
          </circle>
        )}
      </Layer>

      <Layer offset={0.28} rise={170}>
        <defs>
          <linearGradient id="front" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0f5dac" />
            <stop offset="1" stopColor="#093f7a" />
          </linearGradient>
        </defs>
        <path
          d="M0 852 C 240 820, 420 812, 640 836 S 1040 872, 1240 836 S 1400 820, 1440 826 L1440 900 L0 900 Z"
          fill="url(#front)"
        />
      </Layer>
    </div>
  )
}

function Layer({
  offset,
  rise,
  className = '',
  children,
}: {
  offset: number
  rise: number
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`layer ${className}`} style={{ '--offset': offset } as React.CSSProperties}>
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
