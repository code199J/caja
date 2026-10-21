import { IconChart, IconList, IconMove, IconSliders, IconSplit, IconTarget } from './icons'

export type Tab = 'repartir' | 'movimientos' | 'analisis' | 'metas' | 'ajustes'

const TABS: Array<{ id: Tab; label: string; icon: () => React.ReactElement }> = [
  { id: 'repartir', label: 'Repartir', icon: IconSplit },
  { id: 'movimientos', label: 'Movimientos', icon: IconMove },
  { id: 'analisis', label: 'Análisis', icon: IconChart },
  { id: 'metas', label: 'Metas', icon: IconTarget },
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

// IconList ya no se usa en las pestañas, se mantiene por si vuelve al diseño
void IconList
