import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Currency, ExpenseEntry, Goal, IncomeEntry, Rates, Settings } from './types'
import { EMPTY_RATES } from './types'
import { buildPlan } from './engine/allocate'
import { fetchRates } from './engine/rates'
import {
  coveredThisMonth,
  loadExpenses,
  loadGoals,
  loadHistory,
  loadRates,
  loadSettings,
  newId,
  saveExpenses,
  saveGoals,
  saveHistory,
  saveSettings,
} from './lib/store'
import { parseAmount, sanitizeAmountInput, usd } from './lib/format'
import { sanitizeBackup } from './lib/validate'
import { RateRail } from './components/RateRail'
import { AmountPanel, type Source } from './components/AmountPanel'
import { PlanView } from './components/PlanView'
import { GoalsView } from './components/GoalsView'
import { MovimientosView } from './components/MovimientosView'
import { AnalisisView } from './components/AnalisisView'
import { SettingsView } from './components/SettingsView'
import { CuentasView } from './components/CuentasView'
import { Nav, type Tab } from './components/Nav'
import './styles.css'

export default function App() {
  const [tab, setTab] = useState<Tab>('repartir')
  const [rates, setRates] = useState<Rates>(() => loadRates() ?? EMPTY_RATES)
  const [loadingRates, setLoadingRates] = useState(false)
  const [settings, setSettings] = useState<Settings>(() => loadSettings())
  const [goals, setGoals] = useState<Goal[]>(() => loadGoals())
  const [history, setHistory] = useState<IncomeEntry[]>(() => loadHistory())
  const [expenses, setExpenses] = useState<ExpenseEntry[]>(() => loadExpenses())

  const [currency, setCurrency] = useState<Currency>('USD')
  const [source, setSource] = useState<Source>('efectivo_usd')
  const [amountRaw, setAmountRaw] = useState('')
  const [reason, setReason] = useState('')
  const [distMode, setDistMode] = useState<'auto' | 'manual'>('auto')
  const [submitted, setSubmitted] = useState(false)
  const [toast, setToast] = useState('')
  const [toastUndo, setToastUndo] = useState<(() => void) | null>(null)
  const planRef = useRef<HTMLDivElement | null>(null)

  // Sync tab with URL hash
  useEffect(() => {
    const hash = window.location.hash.slice(1)
    const validTabs: Tab[] = ['repartir', 'movimientos', 'analisis', 'metas', 'ajustes', 'cuentas']
    if (hash && validTabs.includes(hash as Tab)) setTab(hash as Tab)
    else if (!hash) setTab('repartir')
  }, [])
  const handleTabChange = (t: Tab) => {
    setTab(t)
    window.location.hash = t
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const refresh = useCallback(async (force = true) => {
    setLoadingRates(true)
    try {
      const next = await fetchRates(force)
      setRates(next)
    } catch {
      setRates((prev) => ({
        ...prev,
        stale: true,
        source: 'guardado',
        error: 'Sin conexión con las tasas. Revisa los datos guardados antes de mover dinero.',
      }))
    } finally {
      setLoadingRates(false)
    }
  }, [])

  // Primer arranque y refresco al volver a la app
  useEffect(() => {
    void refresh(false)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh(false)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refresh])

  useEffect(() => saveSettings(settings), [settings])
  useEffect(() => saveGoals(goals), [goals])
  useEffect(() => saveHistory(history), [history])
  useEffect(() => saveExpenses(expenses), [expenses])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 3200)
    return () => clearTimeout(t)
  }, [toast])

  const amount = useMemo(() => parseAmount(sanitizeAmountInput(amountRaw)), [amountRaw])

  const covered = useMemo(() => coveredThisMonth(history), [history])

  const plan = useMemo(
    () => buildPlan({ amount, currency, rates, settings, goals, coveredBefore: covered }),
    [amount, currency, rates, settings, goals, covered],
  )

  const handleSubmit = async () => {
    await refresh(true)
    setSubmitted(true)
    requestAnimationFrame(() => {
      planRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const handleRegister = () => {
    if (plan.usdTotal <= 0) return
    const reserve = plan.buckets.filter((b) => b.id === 'colchon').reduce((s, b) => s + b.usd, 0)
    const goalAdds = plan.buckets
      .filter((b) => b.id === 'meta' && b.goalId)
      .map((b) => ({ id: b.goalId!, usd: b.usd }))

    const entry: IncomeEntry = {
      id: newId(),
      at: Date.now(),
      amount,
      currency,
      rateUsed: currency === 'VES' ? rates.paralelo : 1,
      usdTotal: plan.usdTotal,
      buckets: plan.buckets,
      verdictAction: plan.verdict.action,
      note: reason.trim() || undefined,
      snapshot: { bcv: rates.bcv, paralelo: rates.paralelo, usdtBuy: rates.usdtBuy },
      applied: { reserve, goals: goalAdds },
    }

    setHistory((h) => [entry, ...h])
    if (reserve > 0) setSettings((s) => ({ ...s, reserveSavedUSD: s.reserveSavedUSD + reserve }))
    if (goalAdds.length) {
      setGoals((gs) =>
        gs.map((g) => {
          const add = goalAdds.find((a) => a.id === g.id)
          return add ? { ...g, savedUSD: Math.min(g.targetUSD, g.savedUSD + add.usd) } : g
        }),
      )
    }

    const moved = reserve + goalAdds.reduce((s, a) => s + a.usd, 0)
    setToast(
      moved > 0
        ? `Registrado: ${usd(plan.usdTotal)} repartidos, ${usd(moved)} sumados a colchón y metas.`
        : `Registrado: reparto de ${usd(plan.usdTotal)} guardado.`,
    )
    setSubmitted(false)
    setAmountRaw('')
    setReason('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }


  const handleImport = (data: unknown) => {
    const clean = sanitizeBackup(data, rates.paralelo || rates.bcv || 0)
    if (!clean) {
      setToast('Ese archivo no es un respaldo de Caja.')
      return
    }
    setSettings(clean.settings)
    setGoals(clean.goals)
    setHistory(clean.history)
    setExpenses(clean.expenses)
    setToast(
      clean.hadData
        ? 'Respaldo importado: lo raro se descartó y lo válido quedó.'
        : 'Ese respaldo está vacío o no tenía datos que entienda.',
    )
  }

  const handleDelete = (entry: IncomeEntry) => {
    const deletedEntry = entry
    setHistory((h) => h.filter((e) => e.id !== entry.id))
    if (!entry.applied) {
      setToast('Ingreso borrado (era de una versión vieja: no toqué metas ni colchón).')
      return
    }
    if (entry.applied.reserve > 0) {
      setSettings((s) => ({
        ...s,
        reserveSavedUSD: Math.max(0, s.reserveSavedUSD - entry.applied!.reserve),
      }))
    }
    if (entry.applied.goals.length) {
      setGoals((gs) =>
        gs.map((g) => {
          const add = entry.applied!.goals.find((a) => a.id === g.id)
          return add ? { ...g, savedUSD: Math.max(0, g.savedUSD - add.usd) } : g
        }),
      )
    }
    const undo = () => {
      setHistory((h) => [deletedEntry, ...h])
      if (deletedEntry.applied) {
        if (deletedEntry.applied.reserve > 0) {
          setSettings((s) => ({ ...s, reserveSavedUSD: s.reserveSavedUSD + deletedEntry.applied!.reserve }))
        }
        if (deletedEntry.applied.goals.length) {
          setGoals((gs) =>
            gs.map((g) => {
              const add = deletedEntry.applied!.goals.find((a) => a.id === g.id)
              return add ? { ...g, savedUSD: g.savedUSD + add.usd } : g
            }),
          )
        }
      }
      setToastUndo(null)
      setToast('Ingreso restaurado.')
    }
    setToastUndo(undo)
    setToast('Ingreso borrado.')
  }

  const handleDeleteExpense = (id: string) => {
    const deleted = expenses.find((e) => e.id === id)
    if (!deleted) return
    setExpenses((e) => e.filter((x) => x.id !== id))
    const undo = () => {
      setExpenses((e) => [deleted, ...e])
      setToastUndo(null)
      setToast('Gasto restaurado.')
    }
    setToastUndo(undo)
    setToast('Gasto borrado.')
  }

  const needsSetup = settings.fixedExpensesUSD <= 0

  return (
    <div className="app">
      <header className="topbar">
        <div className="wordmark">
          <h1>caja</h1>
          <span>dónde poner la plata</span>
        </div>
      </header>

      {tab === 'repartir' && (
        <>
          <RateRail rates={rates} loading={loadingRates} onRefresh={() => void refresh(true)} aria-live="polite" />

          {needsSetup && (
            <div className="empty" style={{ marginTop: 16 }}>
              <b>Falta un dato para que el reparto sea real.</b> Dime en Ajustes cuánto son tus gastos
              fijos del mes y la app deja de adivinar.
              <div style={{ marginTop: 10 }}>
                <button className="mini" onClick={() => setTab('ajustes')}>
                  Poner mis gastos fijos
                </button>
              </div>
            </div>
          )}

          <AmountPanel
            amountRaw={amountRaw}
            setAmountRaw={(v) => {
              setAmountRaw(v)
              setSubmitted(false)
            }}
            currency={currency}
            setCurrency={(c) => {
              setCurrency(c)
              setSubmitted(false)
            }}
            source={source}
            setSource={setSource}
            reason={reason}
            setReason={setReason}
            distMode={distMode}
            setDistMode={setDistMode}
            rates={rates}
            busy={loadingRates}
            onSubmit={() => void handleSubmit()}
          />

          <div ref={planRef} style={{ scrollMarginTop: 12 }}>
            {submitted && amount > 0 && (
              <PlanView
                plan={plan}
                rates={rates}
                source={source}
                currency={currency}
                onRegister={handleRegister}
                onEdit={() => {
                  setSubmitted(false)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
              />
            )}
          </div>

          {!submitted && (
            <p className="credit">
              Escribe el monto, toca Repartir y la app consulta BCV, paralelo y USDT P2P en ese momento.
              Nada sale de tu teléfono.
            </p>
          )}
        </>
      )}

      {tab === 'metas' && <GoalsView goals={goals} onChange={setGoals} />}
      {tab === 'movimientos' && (
        <MovimientosView
          history={history}
          expenses={expenses}
          rates={rates}
          onAddExpense={(e) => {
            setExpenses((prev) => [e, ...prev])
            setToast(`Gasto guardado: ${usd(e.usdAtRate)}.`)
          }}
          onDeleteExpense={handleDeleteExpense}
          onDeleteIncome={handleDelete}
        />
      )}
      {tab === 'analisis' && (
        <AnalisisView history={history} expenses={expenses} settings={settings} />
      )}
      {tab === 'ajustes' && (
        <SettingsView
          settings={settings}
          onChange={setSettings}
          goals={goals}
          history={history}
          expenses={expenses}
          onImport={handleImport}
        />
      )}
      {tab === 'cuentas' && (
        <CuentasView history={history} expenses={expenses} rates={rates} />
      )}

      <Nav tab={tab} onChange={handleTabChange} />
      {toast && (
        <div className="toast" role="status" aria-live="polite" aria-atomic="true">
          {toast}
          {toastUndo && (
            <button className="toast-action" onClick={() => { toastUndo(); setToastUndo(null); }}>
              Deshacer
            </button>
          )}
        </div>
      )}
    </div>
  )
}
