import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Currency, Goal, IncomeEntry, Rates, Settings } from './types'
import { EMPTY_RATES } from './types'
import { buildPlan } from './engine/allocate'
import { fetchRates } from './engine/rates'
import {
  coveredThisMonth,
  DEFAULT_SETTINGS,
  loadGoals,
  loadHistory,
  loadRates,
  loadSettings,
  newId,
  saveGoals,
  saveHistory,
  saveSettings,
} from './lib/store'
import { parseAmount, sanitizeAmountInput, usd } from './lib/format'
import { RateRail } from './components/RateRail'
import { AmountPanel, type Source } from './components/AmountPanel'
import { PlanView } from './components/PlanView'
import { GoalsView } from './components/GoalsView'
import { HistoryView } from './components/HistoryView'
import { SettingsView } from './components/SettingsView'
import { Nav, type Tab } from './components/Nav'
import './styles.css'

export default function App() {
  const [tab, setTab] = useState<Tab>('repartir')
  const [rates, setRates] = useState<Rates>(() => loadRates() ?? EMPTY_RATES)
  const [loadingRates, setLoadingRates] = useState(false)
  const [settings, setSettings] = useState<Settings>(() => loadSettings())
  const [goals, setGoals] = useState<Goal[]>(() => loadGoals())
  const [history, setHistory] = useState<IncomeEntry[]>(() => loadHistory())

  const [currency, setCurrency] = useState<Currency>('USD')
  const [source, setSource] = useState<Source>('efectivo_usd')
  const [amountRaw, setAmountRaw] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [toast, setToast] = useState('')
  const planRef = useRef<HTMLDivElement | null>(null)

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
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleImport = (data: unknown) => {
    if (!data || typeof data !== 'object') {
      setToast('Ese archivo no es un respaldo de Caja.')
      return
    }
    const d = data as {
      settings?: Partial<Settings>
      goals?: Goal[]
      history?: IncomeEntry[]
    }
    if (d.settings) setSettings({ ...DEFAULT_SETTINGS, ...d.settings })
    if (Array.isArray(d.goals)) setGoals(d.goals)
    if (Array.isArray(d.history)) setHistory(d.history)
    const hadData = Boolean(d.settings || d.goals?.length || d.history?.length)
    setToast(hadData ? 'Respaldo importado: datos reemplazados.' : 'Ese respaldo está vacío.')
  }

  const handleDelete = (entry: IncomeEntry) => {
    setHistory((h) => h.filter((e) => e.id !== entry.id))
    if (entry.applied) {
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
    }
    setToast('Movimiento borrado y montos devueltos.')
  }

  const needsSetup = settings.fixedExpensesUSD <= 0

  return (
    <div className="app">
      <header className="topbar">
        <div className="wordmark">
          <strong>caja</strong>
          <span>dónde poner la plata</span>
        </div>
      </header>

      {tab === 'repartir' && (
        <>
          <RateRail rates={rates} loading={loadingRates} onRefresh={() => void refresh(true)} />

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
      {tab === 'historial' && (
        <HistoryView history={history} rates={rates} onDelete={handleDelete} />
      )}
      {tab === 'ajustes' && (
        <SettingsView
          settings={settings}
          onChange={setSettings}
          goals={goals}
          history={history}
          onImport={handleImport}
        />
      )}

      <Nav tab={tab} onChange={setTab} />
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
