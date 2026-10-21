import { useState } from 'react'
import type { AccountId, CategoryId, Currency, ExpenseEntry, IncomeEntry, Rates } from '../types'
import { ACCOUNTS, EXPENSE_CATEGORIES } from '../types'
import { bs, monthLabel, parseAmount, sanitizeAmountInput, usd } from '../lib/format'
import { allMovements, type Movement } from '../engine/analyze'
import { newId } from '../lib/store'

interface Props {
  history: IncomeEntry[]
  expenses: ExpenseEntry[]
  rates: Rates
  onAddExpense: (e: ExpenseEntry) => void
  onDeleteExpense: (id: string) => void
  onDeleteIncome: (entry: IncomeEntry) => void
}

interface Draft {
  amountRaw: string
  currency: Currency
  category: CategoryId
  reason: string
  paidFrom: AccountId
}

const emptyDraft: Draft = {
  amountRaw: '',
  currency: 'USD',
  category: 'comida',
  reason: '',
  paidFrom: 'banesco',
}

export function MovimientosView({
  history,
  expenses,
  rates,
  onAddExpense,
  onDeleteExpense,
  onDeleteIncome,
}: Props) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [rateError, setRateError] = useState('')

  const movements = allMovements(history, expenses)
  const groups = new Map<string, Movement[]>()
  for (const m of movements) {
    const key = monthLabel(m.at)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(m)
  }

  const rate = rates.paralelo || rates.bcv || 1
  const draftAmount = parseAmount(sanitizeAmountInput(draft.amountRaw))
  const needsRate = draft.currency === 'VES' && !(rates.paralelo > 0 || rates.bcv > 0)

  const save = () => {
    if (draftAmount <= 0 || needsRate) {
      setRateError(
        needsRate
          ? 'Sin tasas no puedo valuar bolívares: actualiza las tasas y vuelve a intentar.'
          : 'Escribe cuánto salió.',
      )
      return
    }
    setRateError('')
    onAddExpense({
      id: newId(),
      at: Date.now(),
      amount: draftAmount,
      currency: draft.currency,
      category: draft.category,
      reason: draft.reason.trim(),
      paidFrom: draft.paidFrom,
      usdAtRate: draft.currency === 'USD' ? draftAmount : draftAmount / rate,
      snapshot: { bcv: rates.bcv, paralelo: rates.paralelo, usdtBuy: rates.usdtBuy },
    })
    setDraft({ ...emptyDraft, currency: draft.currency, paidFrom: draft.paidFrom })
    setOpen(false)
  }

  return (
    <div>
      <div className="section-head">
        <div>
          <h2>Movimientos</h2>
          <p>
            Entró {usd(history.reduce((s, h) => s + h.usdTotal, 0))} · salió{' '}
            {usd(expenses.reduce((s, e) => s + e.usdAtRate, 0))} en total. Los gastos se registran
            con categoría y motivo, y el análisis sale solo.
          </p>
        </div>
      </div>

      {!open ? (
        <button className="ghost" style={{ marginTop: 14 }} onClick={() => setOpen(true)}>
          Registrar un gasto
        </button>
      ) : (
        <div className="form">
          <div className="field-head" style={{ marginTop: -4 }}>
            <span className="field-title">Nuevo gasto</span>
            <div className="segmented" role="group" aria-label="Moneda del gasto">
              <button
                aria-pressed={draft.currency === 'USD'}
                onClick={() => setDraft({ ...draft, currency: 'USD' })}
              >
                USD
              </button>
              <button
                aria-pressed={draft.currency === 'VES'}
                onClick={() => setDraft({ ...draft, currency: 'VES' })}
              >
                Bs
              </button>
            </div>
          </div>

          <div className="form-row">
            <label htmlFor="exp-amount">Monto</label>
            <input
              id="exp-amount"
              className="input"
              inputMode="decimal"
              placeholder="0,00"
              value={draft.amountRaw}
              onChange={(e) => setDraft({ ...draft, amountRaw: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && save()}
              autoComplete="off"
              name="expense-amount"
            />
            <span className="hint">
              {needsRate
                ? 'Sin tasas no puedo valuar bolívares: actualiza arriba y vuelve a intentar.'
                : draftAmount > 0
                  ? draft.currency === 'USD'
                    ? `≈ ${bs(draftAmount * rate)} al paralelo`
                    : `≈ ${usd(draftAmount / rate)} al paralelo`
                  : 'Escribe cuánto salió.'}
            </span>
            {rateError && (
              <span className="hint" data-warn style={{ color: 'var(--guayaba-ink)' }}>
                {rateError}
              </span>
            )}
          </div>

          <div className="form-row">
            <label>Categoría</label>
            <div className="chips" style={{ marginTop: 2 }}>
              {EXPENSE_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  className="chip"
                  data-on={draft.category === c.id}
                  aria-pressed={draft.category === c.id}
                  onClick={() => setDraft({ ...draft, category: c.id })}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div className="form-row">
            <label htmlFor="exp-reason">Motivo (opcional)</label>
            <input
              id="exp-reason"
              className="input"
              placeholder="Mercado del jueves, pasajes…"
              maxLength={80}
              value={draft.reason}
              onChange={(e) => setDraft({ ...draft, reason: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && save()}
              autoComplete="off"
              name="expense-reason"
            />
          </div>

          <div className="form-row">
            <label>Pagado desde</label>
            <div className="chips" style={{ marginTop: 2 }}>
              {ACCOUNTS.map((a) => (
                <button
                  key={a.id}
                  className="chip"
                  data-on={draft.paidFrom === a.id}
                  aria-pressed={draft.paidFrom === a.id}
                  onClick={() => setDraft({ ...draft, paidFrom: a.id })}
                >
                  {a.short}
                </button>
              ))}
            </div>
          </div>

          <div className="form-actions">
            <button className="mini" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button
              className="mini"
              style={{ background: 'var(--ink)', color: 'var(--paper)', borderColor: 'var(--ink)' }}
              onClick={save}
            >
              Guardar gasto
            </button>
          </div>
        </div>
      )}

      {movements.length === 0 && (
        <div className="empty">
          <b>Sin movimientos.</b> Los ingresos que repartas aparecen aquí solos; los gastos los
          registras con el botón de arriba.
        </div>
      )}

      {[...groups.entries()].map(([month, items]) => (
        <div key={month}>
          <div className="month-label">{month}</div>
          <div className="list">
            {items.map((m) => (
              <div className="history-row" key={m.id}>
                <div>
                  <div className="when">
                    {new Date(m.at).toLocaleDateString('es-VE', { day: '2-digit', month: 'short' })}{' '}
                    ·{' '}
                    {new Date(m.at).toLocaleTimeString('es-VE', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {m.sub ? ` · ${m.sub}` : ''}
                  </div>
                  <div className="what" title={m.label}>
                    {m.label}
                  </div>
                  <button
                    className="mini"
                    style={{ marginTop: 8 }}
                    data-danger="true"
                    onClick={() => {
                      if (m.kind === 'egreso') onDeleteExpense(m.id)
                      else {
                        const entry = history.find((h) => h.id === m.id)
                        if (entry) onDeleteIncome(entry)
                      }
                    }}
                  >
                    Borrar
                  </button>
                </div>
                <div>
                  <div
                    className="total"
                    style={{ color: m.kind === 'egreso' ? 'var(--ink)' : 'var(--positive)' }}
                  >
                    {m.kind === 'egreso' ? '−' : '+'}
                    {m.currency === 'USD' ? usd(m.amount) : bs(m.amount)}
                  </div>
                  <div className="sub">{usd(m.usd)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
