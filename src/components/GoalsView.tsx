import { useState } from 'react'
import type { AccountId, Goal } from '../types'
import { digits, daysUntil, parseAmount, sanitizeAmountInput, todayISO, usd } from '../lib/format'
import { newId } from '../lib/store'

interface Props {
  goals: Goal[]
  onChange: (goals: Goal[]) => void
}

const emptyDraft = (): Goal => ({
  id: newId(),
  name: '',
  targetUSD: 0,
  savedUSD: 0,
  deadline: new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10),
  priority: 2,
  account: 'binance',
  active: true,
})

export function GoalsView({ goals, onChange }: Props) {
  const [draft, setDraft] = useState<Goal | null>(null)
  const editing = draft && goals.some((g) => g.id === draft.id)

  const save = () => {
    if (!draft || !draft.name.trim() || draft.targetUSD <= 0) return
    const exists = goals.some((g) => g.id === draft.id)
    onChange(exists ? goals.map((g) => (g.id === draft.id ? draft : g)) : [...goals, draft])
    setDraft(null)
  }

  const remove = (id: string) => onChange(goals.filter((g) => g.id !== id))

  return (
    <div>
      <div className="section-head">
        <div>
          <h2>Metas</h2>
          <p>
            Cada proyecto con monto y fecha: la app reparte primero a la meta más urgente. Sin metas, el
            dinero de proyectos se vuelve caja libre.
          </p>
        </div>
      </div>

      {goals.length === 0 && !draft && (
        <div className="empty">
          <b>Todavía no hay metas.</b> Crea una —una herramienta del taller, un mes de reserva, la
          laptop— y cada ingreso empezará a empujarla.
        </div>
      )}

      <div className="list">
        {goals.map((g) => {
          const progress = Math.min(100, (g.savedUSD / Math.max(1, g.targetUSD)) * 100)
          const days = daysUntil(g.deadline)
          return (
            <div className="goal-row" key={g.id}>
              <div className="goal-top">
                <div>
                  <div className="goal-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.name}</div>
                  <div className="goal-meta">
                    {usd(g.savedUSD)} de {usd(g.targetUSD)} · {g.deadline} ·{' '}
                    {days < 0 ? 'vencida' : `${days} días`} ·{' '}
                    {g.account === 'binance' ? 'USDT' : 'efectivo'}
                  </div>
                </div>
                <div className="goal-meta">{Math.round(progress)}%</div>
              </div>
              <div className="goal-track">
                <i style={{ width: `${progress}%` }} />
              </div>
              <div className="goal-actions">
                <button className="mini" onClick={() => setDraft({ ...g })}>
                  Editar
                </button>
                <button
                  className="mini"
                  data-danger="true"
                  onClick={() => remove(g.id)}
                  aria-label={`Borrar meta ${g.name}`}
                >
                  Borrar
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {draft ? (
        <div className="form">
          <div className="form-row">
            <label htmlFor="goal-name">Nombre del proyecto</label>
            <input
              id="goal-name"
              className="input"
              value={draft.name}
              placeholder="Herramienta del taller"
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </div>
          <div className="grid-2">
            <div className="form-row">
              <label htmlFor="goal-target">Meta</label>
              <input
                id="goal-target"
                className="input"
                inputMode="decimal"
                value={draft.targetUSD ? digits(draft.targetUSD) : ''}
                placeholder="300"
                onChange={(e) => setDraft({ ...draft, targetUSD: parseAmount(sanitizeAmountInput(e.target.value)) })}
              />
            </div>
            <div className="form-row">
              <label htmlFor="goal-saved">Ya apartado</label>
              <input
                id="goal-saved"
                className="input"
                inputMode="decimal"
                value={draft.savedUSD ? digits(draft.savedUSD) : ''}
                placeholder="0"
                onChange={(e) => setDraft({ ...draft, savedUSD: parseAmount(sanitizeAmountInput(e.target.value)) })}
              />
            </div>
          </div>
          <div className="grid-2">
            <div className="form-row">
              <label htmlFor="goal-deadline">Fecha límite</label>
              <input
                id="goal-deadline"
                className="input"
                type="date"
                min={todayISO()}
                value={draft.deadline}
                onChange={(e) => setDraft({ ...draft, deadline: e.target.value })}
              />
            </div>
            <div className="form-row">
              <label htmlFor="goal-priority">Prioridad</label>
              <select
                id="goal-priority"
                className="select"
                value={draft.priority}
                onChange={(e) =>
                  setDraft({ ...draft, priority: Number(e.target.value) as Goal['priority'] })
                }
              >
                <option value={1}>Alta</option>
                <option value={2}>Media</option>
                <option value={3}>Baja</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <label htmlFor="goal-account">Guardarlo en</label>
            <select
              id="goal-account"
              className="select"
              value={draft.account}
              onChange={(e) => setDraft({ ...draft, account: e.target.value as AccountId })}
            >
              <option value="binance">Binance (USDT) — no se derrite</option>
              <option value="efectivo_usd">Efectivo USD — sin depender de plataformas</option>
            </select>
          </div>
          <div className="form-actions">
            <button className="mini" onClick={() => setDraft(null)}>
              Cancelar
            </button>
            <button className="mini" onClick={save} style={{ background: 'var(--ink)', color: 'var(--paper)', borderColor: 'var(--ink)' }}>
              {editing ? 'Guardar cambios' : 'Crear meta'}
            </button>
          </div>
        </div>
      ) : (
        <button className="ghost" style={{ marginTop: 16 }} onClick={() => setDraft(emptyDraft())}>
          Agregar meta
        </button>
      )}
    </div>
  )
}
