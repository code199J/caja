import type { Rates } from '../types'
import { pct, rate as fmtRate, relativeTime } from '../lib/format'
import { IconRefresh } from './icons'

interface Props {
  rates: Rates
  loading: boolean
  onRefresh: () => void
  ariaLive?: 'polite' | 'assertive'
}

export function RateRail({ rates, loading, onRefresh, ariaLive = 'polite' }: Props) {
  const gap = rates.bcv > 0 ? (rates.paralelo / rates.bcv - 1) * 100 : 0
  const premium =
    rates.paralelo > 0 && rates.usdtBuy > 0 ? (rates.usdtBuy / rates.paralelo - 1) * 100 : 0

  return (
    <section className="rates" aria-label="Tasas del día">
      <div className="rate-cell">
        <span className="label">BCV oficial</span>
        <span className="value">{fmtRate(rates.bcv)}</span>
        <span className="sub">
          {rates.bcvDrift30d ? `${pct(rates.bcvDrift30d)} /mes` : 'sin histórico'}
        </span>
      </div>
      <div className="rate-cell" data-tone={premium > 0 ? 'up' : 'down'}>
        <span className="label">USDT P2P</span>
        <span className="value">{fmtRate(rates.usdtBuy)}</span>
        <span className="sub">{rates.usdtBuy ? `${pct(premium)} vs par.` : 'sin datos'}</span>
      </div>
      <div className="rate-cell">
        <span className="label">Paralelo</span>
        <span className="value">{fmtRate(rates.paralelo)}</span>
        <span className="sub">{rates.paralelo ? `brecha ${pct(gap, 0)}` : 'sin datos'}</span>
      </div>
      <div className="rate-note" data-warn={Boolean(rates.stale)}>
        <button className="refresh" onClick={onRefresh} data-busy={loading} aria-label="Actualizar tasas" aria-live={loading ? ariaLive : 'off'}>
          <IconRefresh />
          {loading ? 'Consultando…' : relativeTime(rates.fetchedAt)}
        </button>
        <span>
          {rates.stale
            ? rates.error ?? 'Tasas guardadas: actualiza antes de mover dinero.'
            : `Compra USDT desde Bs ${fmtRate(rates.usdtBest || rates.usdtBuy)} · vende a Bs ${fmtRate(rates.usdtSell || rates.usdtBuy)}`}
        </span>
      </div>
    </section>
  )
}
