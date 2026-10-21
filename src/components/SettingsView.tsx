import type { ExpenseEntry, Goal, IncomeEntry, Settings } from '../types'
import { digits, parseAmount, sanitizeAmountInput, usd } from '../lib/format'

interface Props {
  settings: Settings
  onChange: (s: Settings) => void
  goals: Goal[]
  history: IncomeEntry[]
  expenses: ExpenseEntry[]
  onImport: (data: unknown) => void
}

export function SettingsView({ settings, onChange, goals, history, expenses, onImport }: Props) {
  const importFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        onImport(JSON.parse(String(reader.result)))
      } catch {
        /* el mensaje de error lo pone la app */
      }
    }
    reader.readAsText(file)
  }

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    onChange({ ...settings, [key]: value })

  const exportBackup = () => {
    const data = JSON.stringify(
      { settings, goals, history, expenses, exportedAt: new Date().toISOString() },
      null,
      2,
    )
    const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `caja-respaldo-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const reserveTarget = settings.reserveMonths * settings.fixedExpensesUSD
  const reserveProgress = reserveTarget > 0 ? (settings.reserveSavedUSD / reserveTarget) * 100 : 0

  return (
    <div>
      <div className="section-head">
        <div>
          <h2>Ajustes</h2>
          <p>Estos números son los que usa el motor para decidir cuánto va a cada lado.</p>
        </div>
      </div>

      <div className="form">
        <div className="form-row">
          <label htmlFor="fixed">Gastos fijos del mes (USD)</label>
          <input
            id="fixed"
            className="input"
            inputMode="decimal"
            value={settings.fixedExpensesUSD ? digits(settings.fixedExpensesUSD) : ''}
            placeholder="350"
            onChange={(e) => set('fixedExpensesUSD', parseAmount(sanitizeAmountInput(e.target.value)))}
          />
          <span className="hint">
            Comida, pasajes, servicios, internet, teléfono. Es la base de todo: sin esto la app reparte a
            ciegas.
          </span>
        </div>

        <div className="form-row">
          <label>¿Los gastos se pagan en bolívares?</label>
          <div className="segmented" style={{ alignSelf: 'start' }}>
            <button aria-pressed={settings.expensesInBs} onClick={() => set('expensesInBs', true)}>
              Sí, en Bs
            </button>
            <button aria-pressed={!settings.expensesInBs} onClick={() => set('expensesInBs', false)}>
              En dólares
            </button>
          </div>
        </div>

        <div className="grid-2">
          <div className="form-row">
            <label htmlFor="months">Meses de colchón</label>
            <input
              id="months"
              className="input"
              inputMode="numeric"
              value={settings.reserveMonths}
              onChange={(e) => set('reserveMonths', Math.max(0, Number(e.target.value) || 0))}
            />
          </div>
          <div className="form-row">
            <label htmlFor="saved">Colchón ya ahorrado (USD)</label>
            <input
              id="saved"
              className="input"
              inputMode="decimal"
              value={settings.reserveSavedUSD ? digits(settings.reserveSavedUSD) : ''}
              placeholder="0"
              onChange={(e) => set('reserveSavedUSD', parseAmount(sanitizeAmountInput(e.target.value)))}
            />
          </div>
        </div>
        <span className="hint">
          Meta de colchón {usd(reserveTarget)} ({settings.reserveMonths} meses). Llevas{' '}
          {Math.min(100, Math.round(reserveProgress))}%. Los ingresos registrados aumentan este número
          solos.
        </span>

        <div className="form-row">
          <label>Tu prioridad</label>
          <div className="segmented" style={{ alignSelf: 'start', flexWrap: 'wrap' }}>
            <button aria-pressed={settings.risk === 'liquidez'} onClick={() => set('risk', 'liquidez')}>
              Liquidez
            </button>
            <button
              aria-pressed={settings.risk === 'equilibrado'}
              onClick={() => set('risk', 'equilibrado')}
            >
              Equilibrio
            </button>
            <button aria-pressed={settings.risk === 'dolarizar'} onClick={() => set('risk', 'dolarizar')}>
              Dolarizar
            </button>
          </div>
          <span className="hint">
            Liquidez: plata disponible y poco en cripto. Equilibrio: reparto parejo. Dolarizar: saca de
            bolívares lo antes posible.
          </span>
        </div>

        <div className="form-row">
          <label htmlFor="split">Dividir custodia por encima de (USD)</label>
          <input
            id="split"
            className="input"
            inputMode="decimal"
            value={settings.custodySplitUSD ? digits(settings.custodySplitUSD) : ''}
            placeholder="400"
            onChange={(e) => set('custodySplitUSD', parseAmount(sanitizeAmountInput(e.target.value)))}
          />
          <span className="hint">
            Si el colchón que vas a apartar pasa de este monto, la app lo parte entre Binance y efectivo
            para no depender de una sola cuenta.
          </span>
        </div>
      </div>

      <div className="section-head">
        <div>
          <h2>Cómo decide</h2>
        </div>
      </div>
      <ul className="notes">
        <li>Primero cubre los gastos fijos que faltan del mes; el excedente se reparte según el tamaño del ingreso frente a esos gastos.</li>
        <li>El colchón tiene techo (meses definidos arriba). Lo que sobra de ahí vuelve a caja libre o a las metas.</li>
        <li>Metas: se abona primero a la más urgente (prioridad ÷ raíz de los días que faltan).</li>
        <li>USDT se compra solo si el precio P2P no está muy por encima del paralelo y hay dinero que no vas a gastar pronto.</li>
        <li>Consulta BCV, paralelo, USDT P2P y el ritmo de devaluación del BCV antes de cada reparto.</li>
      </ul>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="ghost" onClick={exportBackup}>
          Descargar respaldo
        </button>
        <label className="ghost" style={{ cursor: 'pointer' }}>
          Importar respaldo
          <input
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) importFile(file)
              e.target.value = ''
            }}
          />
        </label>
      </div>
      <p className="credit">
        Los datos viven en este dispositivo, no en un servidor: lo que registres en la PC no aparece en
        el teléfono y viceversa. Para pasarlos, descarga el respaldo aquí e impórtalo en el otro. Tasas:
        dolarapi.com (BCV y paralelo) y criptoya.com (USDT P2P). Ninguna app decide por ti: el reparto es
        una recomendación calculada con tus números.
      </p>
    </div>
  )
}
