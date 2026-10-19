import { IconList, IconSliders, IconSplit, IconTarget } from './icons'

export type Tab = 'repartir' | 'metas' | 'historial' | 'ajustes'

const TABS: Array<{ id: Tab; label: string; icon: () => React.ReactElement }> = [
  { id: 'repartir', label: 'Repartir', icon: IconSplit },
  { id: 'metas', label: 'Metas', icon: IconTarget },
  { id: 'historial', label: 'Historial', icon: IconList },
  { id: 'ajustes', label: 'Ajustes', icon: IconSliders },
]

export function Nav({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="tabbar" aria-label="Secciones">
      <div className="tabbar-inner">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            aria-current={tab === id ? 'page' : undefined}
            onClick={() => {
              onChange(id)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          >
            <Icon />
            {label}
          </button>
        ))}
      </div>
    </nav>
  )
}
