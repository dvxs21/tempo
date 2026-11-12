import { Flame, HeartPulse, House, Link2, ListMusic, RefreshCw } from 'lucide-react'

export type Tab = 'home' | 'workouts' | 'power' | 'heart' | 'settings'

// Dock slots, left to right. Home is the big centre button.
const SLOT: Partial<Record<Tab, number>> = { workouts: 0, power: 1, heart: 3 }

interface Props {
  tab: Tab
  onTab: (t: Tab) => void
  demo: boolean
  busy: boolean
  onSync: () => void
}

/**
 * Floating control dock: Workouts and Power on the left, Home as the big pink
 * button in the middle, Heart and Sync on the right. A white blob slides behind
 * the active destination; while on demo data, Sync becomes Connect.
 */
export function Dock({ tab, onTab, demo, busy, onSync }: Props) {
  // On Home (or Settings) the blob glides into the centre and shrinks away behind
  // the Home button, then grows back out of it, instead of sliding off the side.
  // While on demo data the right-hand slot is Connect, which opens Settings,
  // so Settings gets the highlight there too.
  const slot = tab === 'settings' && demo ? 4 : SLOT[tab]
  const hidden = slot === undefined
  const blobStyle = {
    transform: `translateX(${(hidden ? 2 : slot) * 100}%) scale(${hidden ? 0.35 : 1})`,
    opacity: hidden ? 0 : 1,
  }

  const item = (id: Tab, label: string, Icon: typeof House) => (
    <button
      key={id}
      className={`dock-item ${tab === id ? 'active' : ''}`}
      onClick={() => onTab(id)}
      aria-current={tab === id ? 'page' : undefined}
    >
      <Icon size={21} strokeWidth={2.2} aria-hidden />
      <span>{label}</span>
    </button>
  )

  return (
    <nav className="dock" aria-label="Main">
      <span
        className="dock-blob"
        style={blobStyle}
        aria-hidden
      />
      {item('workouts', 'Workouts', ListMusic)}
      {item('power', 'Power', Flame)}
      <button
        className={`dock-action ${tab === 'home' ? 'active' : ''}`}
        onClick={() => onTab('home')}
        aria-label="Home"
        aria-current={tab === 'home' ? 'page' : undefined}
      >
        <House size={25} strokeWidth={2.4} aria-hidden />
      </button>
      {item('heart', 'Heart', HeartPulse)}
      {demo ? (
        <button
          className={`dock-item ${tab === 'settings' ? 'active' : ''}`}
          onClick={() => onTab('settings')}
          aria-current={tab === 'settings' ? 'page' : undefined}
        >
          <Link2 size={21} strokeWidth={2.2} aria-hidden />
          <span>Connect</span>
        </button>
      ) : (
        <button className="dock-item" onClick={onSync} disabled={busy} aria-label={busy ? 'Syncing' : 'Sync now'}>
          <RefreshCw size={21} strokeWidth={2.2} className={busy ? 'spin' : ''} aria-hidden />
          <span>{busy ? 'Syncing' : 'Sync'}</span>
        </button>
      )}
    </nav>
  )
}
