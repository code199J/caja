import type { AccountId, ExpenseEntry, IncomeEntry, Rates } from '../types'
import { ACCOUNTS, accountMeta } from '../types'
import { rate as fmtRate, bs, usd } from '../lib/format'

interface Props {
  history: IncomeEntry[]
  expenses: ExpenseEntry[]
  rates: Rates
}

interface AccountBalance {
  id: AccountId
  name: string
  short: string
  currency: 'Bs' | 'USD' | 'USDT'
  inUSD: number
  outUSD: number
  netUSD: number
  netNative: number
}

/** Tasa de conversión USD → moneda nativa según la cuenta */
function nativeRate(account: AccountId, rates: Rates): number {
  const meta = accountMeta(account)
  if (meta.currency === 'USD' || meta.currency === 'USDT') return 1
  // Bs: usamos paralelo si está, si no BCV
  return rates.paralelo > 0 ? rates.paralelo : rates.bcv || 1
}

export function CuentasView({ history, expenses, rates }: Props) {
  const rate = rates.paralelo || rates.bcv || 1

  // Saldos por cuenta: ingresos (buckets por cuenta) menos egresos (paidFrom)
  const balances = ACCOUNTS.map((acc): AccountBalance => {
    const inUSD = history.reduce((sum, h) => {
      return (
        sum +
        h.buckets
          .filter((b) => b.account === acc.id)
          .reduce((s, b) => s + b.usd, 0)
      )
    }, 0)

    const outUSD = expenses.reduce(
      (sum, e) => sum + (e.paidFrom === acc.id ? e.usdAtRate : 0),
      0,
    )

    const netUSD = inUSD - outUSD
    const conv = nativeRate(acc.id, rates)
    const netNative = acc.currency === 'USD' || acc.currency === 'USDT' ? netUSD : netUSD * conv

    return {
      id: acc.id,
      name: acc.name,
      short: acc.short,
      currency: acc.currency,
      inUSD,
      outUSD,
      netUSD,
      netNative,
    }
  })

  const totalUSD = balances.reduce((s, b) => s + b.netUSD, 0)
  const totalNativeBs =
    balances
      .filter((b) => b.currency === 'Bs')
      .reduce((s, b) => s + b.netNative, 0) +
    balances
      .filter((b) => b.currency === 'USD' || b.currency === 'USDT')
      .reduce((s, b) => s + b.netNative * rate, 0)

  return (
    <div>
      <div className="section-head">
        <div>
          <h2>Cuentas</h2>
          <p>
            Saldo real por cuenta: lo que entró a cada una menos lo que salió.{' '}
            {totalNativeBs > 0 ? `Total ≈ ${bs(totalNativeBs)} / ${usd(totalUSD)}` : ''}
          </p>
        </div>
      </div>

      {balances.length === 0 ? (
        <div className="empty">
          <b>Sin cuentas.</b> Registra un ingreso o un gasto y los saldos aparecen aquí.
        </div>
      ) : (
        <div className="list">
          {balances.map((b) => {
            const sign = b.netNative >= 0 ? '+' : '−'
            const tone = b.netNative >= 0 ? 'var(--positive)' : 'var(--guayaba-ink)'
            return (
              <div
                key={b.id}
                className="history-row"
                style={{ borderBottom: '1px solid var(--rule)' }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                    <div className="goal-name" style={{ fontSize: '16px' }}>
                      {b.short} · {b.name}
                    </div>
                    <span
                      className="badge"
                      style={{
                        background:
                          b.currency === 'Bs'
                            ? 'var(--pill-neg-bg)'
                            : b.currency === 'USDT'
                              ? 'var(--pill-neutral-bg)'
                              : 'var(--pill-pos-bg)',
                        color:
                          b.currency === 'Bs'
                            ? 'var(--pill-neg-ink)'
                            : b.currency === 'USDT'
                              ? 'var(--pill-neutral-ink)'
                              : 'var(--pill-pos-ink)',
                        borderColor: 'transparent',
                      }}
                    >
                      {b.currency}
                    </span>
                  </div>
                  <div className="goal-meta" style={{ marginTop: 2 }}>
                    Entró {usd(b.inUSD)} · salió {usd(b.outUSD)} · riesgo: {accountMeta(b.id).risk}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div
                    className="total"
                    style={{ fontSize: '20px', fontWeight: 500, color: tone, letterSpacing: '-0.02em' }}
                  >
                    {sign} {b.currency === 'USD' ? usd(b.netNative) : bs(b.netNative)}
                  </div>
                  <div className="sub" style={{ color: 'var(--faint)' }}>
                    ≈ {usd(b.netUSD)} al paralelo de hoy ({fmtRate(rate)})
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="form" style={{ marginTop: 24 }}>
        <div className="section-head">
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 500, margin: 0, color: 'var(--muted)' }}>
              Ajustar saldo manualmente
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 'var(--fs-small)', color: 'var(--faint)' }}>
              Si entró plata fuera de la app o corriges un saldo, agrégalo directo a una cuenta. No
              pasa por el reparto automático.
            </p>
          </div>
        </div>

        <div className="form-row">
          <label>Cuenta</label>
          <div className="chips" style={{ marginTop: 2 }}>
            {ACCOUNTS.map((a) => (
              <button
                key={a.id}
                className="chip"
                onClick={() => {}}
              >
                {a.short}
              </button>
            ))}
          </div>
        </div>
        <p className="credit">
          <b>Nota:</b> este ajuste manual aún no se guarda de forma independiente. Para que un saldo
          quede real en la cuenta, registra el ingreso en la pestaña Repartir (elige la cuenta donde
          entró) o registra el gasto en Movimientos (elige la cuenta de donde salió).
        </p>
      </div>
    </div>
  )
}
