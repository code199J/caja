import type { IncomeEntry, Rates } from '../types'
import { bs, monthLabel, pct, usd } from '../lib/format'

interface Props {
  history: IncomeEntry[]
  rates: Rates
  onDelete: (entry: IncomeEntry) => void
}

const ACTION_LABEL: Record<IncomeEntry['verdictAction'], string> = {
  comprar_usdt: 'comprar USDT',
  mixto: 'reparto mixto',
  quedarse_bs: 'quedarse en Bs',
  solo_gastos: 'gastos',
}

export function HistoryView({ history, rates, onDelete }: Props) {
  const sorted = [...history].sort((a, b) => b.at - a.at)
  const groups = new Map<string, IncomeEntry[]>()
  for (const entry of sorted) {
    const key = monthLabel(entry.at)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(entry)
  }

  const totalUSD = sorted.reduce((s, h) => s + h.usdTotal, 0)
  const totalBs = sorted.reduce((s, h) => s + h.usdTotal, 0) * (rates.paralelo || 1)

  return (
    <div>
      <div className="section-head">
        <div>
          <h2>Historial</h2>
          <p>
            {sorted.length === 0
              ? 'Aquí queda cada ingreso con el reparto que decidiste.'
              : `${sorted.length} ingresos · ${usd(totalUSD)} · ≈ ${bs(totalBs)} al paralelo de hoy`}
          </p>
        </div>
      </div>

      {sorted.length === 0 && (
        <div className="empty">
          <b>Sin movimientos todavía.</b> Registra un ingreso desde Repartir y aparece aquí con su
          reparto completo.
        </div>
      )}

      {[...groups.entries()].map(([month, entries]) => (
        <div key={month}>
          <div className="month-label">{month}</div>
          <div className="list">
            {entries.map((entry) => (
              <div className="history-row" key={entry.id}>
                <div>
                  <div className="when">
                    {new Date(entry.at).toLocaleDateString('es-VE', {
                      day: '2-digit',
                      month: 'short',
                    })}{' '}
                    ·{' '}
                    {new Date(entry.at).toLocaleTimeString('es-VE', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                  <div className="what">
                    {entry.currency === 'USD' ? usd(entry.amount) : bs(entry.amount)} ·{' '}
                    {ACTION_LABEL[entry.verdictAction]}
                  </div>
                  <button
                    className="mini"
                    style={{ marginTop: 8 }}
                    data-danger="true"
                    onClick={() => onDelete(entry)}
                  >
                    Borrar
                  </button>
                </div>
                <div>
                  <div className="total">{usd(entry.usdTotal)}</div>
                  <div className="sub">
                    {entry.snapshot
                      ? `USDT ${entry.snapshot.usdtBuy.toFixed(2)} · ${pct(
                          (entry.snapshot.paralelo / entry.snapshot.bcv - 1) * 100,
                          0,
                        )} brecha`
                      : 'sin tasas'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
