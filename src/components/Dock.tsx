import { Flame, HeartPulse, House, Link2, ListMusic, RefreshCw } from 'lucide-react'

export type Tab = 'home' | 'workouts' | 'power' | 'heart' | 'settings'

const LEFT: [Tab, string, typeof House][] = [
  ['home', 'Home', House],
  ['workouts', 'Workouts', ListMusic],
]
const RIGHT: [Tab, string, typeof House][] = [
  ['power', 'Power', Flame],
  ['heart', 'Heart', HeartPulse],
]
const ORDER: Tab[] = ['home', 'workouts', 'power', 'heart']

interface Props {
  tab: Tab
  onTab: (t: Tab) => void
  demo: boolean
  busy: boolean
  onSync: () => void
}

/**
 * Floating control dock at the bottom: four destinations plus a big pink action
 * in the middle (Sync when connected, Connect while showing demo data).
 * A pink blob slides behind the active destination.
 */
export function Dock({ tab, onTab, demo, busy, onSync }: Props) {
  const idx = ORDER.indexOf(tab)
  // slot positions: 0,1 | action | 2,3
  const slot = idx < 0 ? -1 : idx < 2 ? idx : idx + 1

  const item = ([id, label, Icon]: (typeof LEFT)[number]) => (
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
        style={{ transform: `translateX(${slot * 100}%)`, opacity: slot < 0 ? 0 : 1 }}
        aria-hidden
      />
      {LEFT.map(item)}
      <button
        className={`dock-action ${demo ? 'invite' : ''}`}
        onClick={demo ? () => onTab('settings') : onSync}
        disabled={busy}
        aria-label={demo ? 'Connect your accounts' : busy ? 'Syncing' : 'Sync now'}
      >
        {demo ? (
          <Link2 size={24} strokeWidth={2.4} aria-hidden />
        ) : (
          <RefreshCw size={24} strokeWidth={2.4} className={busy ? 'spin' : ''} aria-hidden />
        )}
      </button>
      {RIGHT.map(item)}
    </nav>
  )
}
