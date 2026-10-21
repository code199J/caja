import { useMemo, useState } from 'react'
import type { ExpenseEntry, IncomeEntry, Settings } from '../types'
import { monthsWithData, monthStats } from '../engine/analyze'
import { monthKeyLocal, monthLabel, usd, digits } from '../lib/format'

interface Props {
  history: IncomeEntry[]
  expenses: ExpenseEntry[]
  settings: Settings
}

export function AnalisisView({ history, expenses, settings }: Props) {
  const months = useMemo(() => monthsWithData(history, expenses), [history, expenses])
  const current = monthKeyLocal(Date.now())
  const [monthKey, setMonthKey] = useState(months[0] ?? current)
  const key = months.includes(monthKey) ? monthKey : (months[0] ?? current)

  const stats = useMemo(() => monthStats(key, history, expenses), [key, history, expenses])
  const label = monthLabel(new Date(`${key}-15T12:00:00`).getTime())

  const total = Math.max(1, stats.outUSD)
  const coverageDays =
    settings.fixedExpensesUSD > 0 ? Math.round((stats.inUSD / settings.fixedExpensesUSD) * 30) : 0
  const spendVsFixed =
    settings.fixedExpensesUSD > 0 ? (stats.outUSD / settings.fixedExpensesUSD) * 100 : 0

  return (
    <div>
      <div className="section-head">
        <div>
          <h2>Análisis</h2>
          <p>Lo que entró, lo que salió y hacia dónde se fue, mes por mes.</p>
        </div>
      </div>

      {months.length > 1 && (
        <div className="chips" style={{ marginTop: 12 }}>
          {months.map((mk) => (
            <button
              key={mk}
              className="chip"
              data-on={mk === key}
              aria-pressed={mk === key}
              onClick={() => setMonthKey(mk)}
            >
              {monthLabel(new Date(`${mk}-15T12:00:00`).getTime())}
            </button>
          ))}
        </div>
      )}

      {stats.inUSD === 0 && stats.outUSD === 0 ? (
        <div className="empty" style={{ marginTop: 16 }}>
          <b>Nada registrado en {label}.</b> Reparte un ingreso o registra gastos en Movimientos y
          aquí aparece el desglose.
        </div>
      ) : (
        <>
          <div className="big-row" style={{ marginTop: 16 }}>
            <div className="big-cell">
              <span className="big-label">Entró</span>
              <span className="big-value num">{usd(stats.inUSD)}</span>
            </div>
            <div className="big-cell">
              <span className="big-label">Salió</span>
              <span className="big-value num" data-neg>
                {usd(stats.outUSD)}
              </span>
            </div>
            <div className="big-cell">
              <span className="big-label">Neto</span>
              <span
                className="big-value num"
                data-neg={stats.net < 0}
                style={{ color: stats.net >= 0 ? 'var(--verde)' : 'var(--guayaba-ink)' }}
              >
                {stats.net >= 0 ? '+' : '−'}
                {usd(Math.abs(stats.net))}
              </span>
            </div>
          </div>

          <section className="coverage" aria-label="Resumen del mes">
            <div className="coverage-top">
              <span>
                {coverageDays >= 30
                  ? 'El mes quedó cubierto'
                  : `Los ingresos cubren ${coverageDays} de 30 días`}
              </span>
              <b>{settings.fixedExpensesUSD > 0 ? usd(settings.fixedExpensesUSD) : 'sin gastos fijos'}</b>
            </div>
            <div className="coverage-track">
              <i style={{ width: `${Math.min(100, (coverageDays / 30) * 100)}%` }} />
            </div>
            <div className="coverage-top" style={{ marginTop: 8 }}>
              <span>Lo gastado frente a tus gastos fijos</span>
              <b>{spendVsFixed > 0 ? `${digits(spendVsFixed, 0)}%` : '—'}</b>
            </div>
            <div className="coverage-track">
              <i
                style={{
                  width: `${Math.min(100, spendVsFixed)}%`,
                  background: spendVsFixed > 100 ? 'var(--guayaba)' : 'var(--verde)',
                }}
              />
            </div>
          </section>

          {stats.byCategory.length > 0 && (
            <section className="cat-block" aria-label="Gasto por categoría">
              <h3>Por categoría</h3>
              {stats.byCategory.map((c) => (
                <div className="bar-row" key={c.id}>
                  <span className="bar-name">{c.name}</span>
                  <span className="bar-track">
                    <i style={{ width: `${Math.max(2, (c.usd / total) * 100)}%` }} />
                  </span>
                  <span className="bar-amt num">
                    {usd(c.usd)} <small>{digits(c.pct, 0)}%</small>
                  </span>
                </div>
              ))}
            </section>
          )}

          {stats.top.length > 0 && (
            <section className="steps" aria-label="Mayores gastos">
              <h3>Mayores gastos</h3>
              <ol>
                {stats.top.map((t) => (
                  <li key={`${t.usd}-${t.at}`}>
                    <span>
                      <b>{usd(t.usd)}</b> · {t.label} <small>({t.category})</small>
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <ul className="notes" style={{ marginTop: 18 }}>
            <li>
              {stats.outUSD > 0
                ? `Salieron ${usd(stats.outUSD)} en ${label}: unos ${usd(stats.avgDaily)} por día.`
                : 'Este mes no tiene gastos registrados todavía.'}
            </li>
            {stats.biggestSlice &&
              stats.biggestSlice.pct >= 35 && (
                <li>
                  {stats.biggestSlice.name} se comió {digits(stats.biggestSlice.pct, 0)}% del gasto
                  ({usd(stats.biggestSlice.usd)}). Vale la pena revisar si fue puntual o se está
                  volviendo costumbre.
                </li>
              )}
            {stats.net < 0 && (
              <li>
                Salieron {usd(Math.abs(stats.net))} más de lo que entró este mes: venía del colchón o
                de lo guardado. Fíjate si es un mes raro o un aviso.
              </li>
            )}
            {coverageDays > 0 && coverageDays < 15 && settings.fixedExpensesUSD > 0 && (
              <li>
                Con lo que entró tienes {coverageDays} días cubiertos: cualquier ingreso extra va
                directo a gastos en el próximo reparto.
              </li>
            )}
          </ul>
        </>
      )}
    </div>
  )
}
