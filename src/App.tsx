import { useCallback, useEffect, useState } from 'react'
import type { Currency, ExpenseEntry, Goal, IncomeEntry, Rates, Settings } from './types'
import { EMPTY_RATES } from './types'
import { fetchRates } from './engine/rates'
import {
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
import { usd } from './lib/format'
import { sanitizeBackup } from './lib/validate'
import { RateRail } from './components/RateRail'
import { GoalsView } from './components/GoalsView'
import { MovimientosView } from './components/MovimientosView'
import { AnalisisView } from './components/AnalisisView'
import { SettingsView } from './components/SettingsView'
import { CuentasView } from './components/CuentasView'
import { Nav, type Tab } from './components/Nav'
import { OnboardingView } from './components/OnboardingView'
import { NegociosView } from './components/NegociosView'
import { RepartirStepper } from './components/RepartirStepper'
import { ErrorBoundary } from './components/ErrorBoundary'
import './styles.css'

export default function App() {
  const [tab, setTab] = useState<Tab>('repartir')
  const [rates, setRates] = useState<Rates>(() => loadRates() ?? EMPTY_RATES)
  const [loadingRates, setLoadingRates] = useState(false)
  const [settings, setSettings] = useState<Settings>(() => loadSettings())
  const [goals, setGoals] = useState<Goal[]>(() => loadGoals())
  const [history, setHistory] = useState<IncomeEntry[]>(() => loadHistory())
  const [expenses, setExpenses] = useState<ExpenseEntry[]>(() => loadExpenses())

  const [toast, setToast] = useState('')
  const [toastUndo, setToastUndo] = useState<(() => void) | null>(null)
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null)
  const [businessSurplus, setBusinessSurplus] = useState<{ amount: number; account: string; reason: string } | null>(null)

  // Sync tab with URL hash
  useEffect(() => {
    const hash = window.location.hash.slice(1)
    const validTabs: Tab[] = ['repartir', 'movimientos', 'analisis', 'metas', 'ajustes', 'cuentas', 'negocios']
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

  useEffect(() => {
    saveSettings(settings)
  }, [settings])
  useEffect(() => {
    saveGoals(goals)
  }, [goals])
  useEffect(() => {
    saveHistory(history)
  }, [history])
  useEffect(() => {
    saveExpenses(expenses)
  }, [expenses])

  // Cargar estado de onboarding desde settings
  useEffect(() => {
    setOnboardingComplete(settings.fixedExpensesUSD > 0)
  }, [settings.fixedExpensesUSD])

  const handleOnboardingComplete = (nextSettings: Settings) => {
    setSettings(nextSettings)
    setOnboardingComplete(true)
  }

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 3200)
    return () => clearTimeout(t)
  }, [toast])

  const handleRegisterFromStepper = (data: {
    amount: number
    currency: Currency
    rateUsed: number
    usdTotal: number
    buckets: { id: string; usd: number }[]
    verdictAction: string
    reason: string
    snapshot: { bcv: number; paralelo: number; usdtBuy: number }
  }) => {
    if (data.usdTotal <= 0) return
    const reserve = data.buckets.filter((b) => b.id === 'colchon').reduce((s, b) => s + b.usd, 0)
    const goalAdds = data.buckets
      .filter((b) => b.id === 'meta' && 'goalId' in b && b.goalId)
      .map((b) => ({ id: (b as { goalId?: string }).goalId!, usd: b.usd }))

    const entry: IncomeEntry = {
      id: newId(),
      at: Date.now(),
      amount: data.amount,
      currency: data.currency,
      rateUsed: data.rateUsed,
      usdTotal: data.usdTotal,
      buckets: data.buckets as any,
      verdictAction: data.verdictAction as any,
      note: data.reason.trim() || undefined,
      snapshot: data.snapshot,
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
        ? `Registrado: ${usd(data.usdTotal)} repartidos, ${usd(moved)} sumados a colchón y metas.`
        : `Registrado: reparto de ${usd(data.usdTotal)} guardado.`,
    )
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

  if (onboardingComplete === false) {
    return (
      <div className="app">
        <OnboardingView onComplete={handleOnboardingComplete} />
      </div>
    )
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="wordmark">
          <h1>caja</h1>
          <span>dónde poner la plata</span>
        </div>
      </header>

      {tab === 'repartir' && (
        <ErrorBoundary tab="Repartir" onReset={() => setTab('repartir')}>
          <>
            <RateRail rates={rates} loading={loadingRates} onRefresh={() => void refresh(true)} aria-live="polite" />

            <RepartirStepper
              rates={rates}
              settings={settings}
              goals={goals}
              history={history}
              businessSurplus={businessSurplus}
              onClearSurplus={() => setBusinessSurplus(null)}
              onRegister={(data) => {
                handleRegisterFromStepper(data)
              }}
              loadingRates={loadingRates}
            />
          </>
        </ErrorBoundary>
      )}

      {tab === 'metas' && (
        <ErrorBoundary tab="Metas" onReset={() => setTab('repartir')}>
          <GoalsView goals={goals} onChange={setGoals} />
        </ErrorBoundary>
      )}
      {tab === 'movimientos' && (
        <ErrorBoundary tab="Movimientos" onReset={() => setTab('repartir')}>
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
        </ErrorBoundary>
      )}
      {tab === 'analisis' && (
        <ErrorBoundary tab="Análisis" onReset={() => setTab('repartir')}>
          <AnalisisView history={history} expenses={expenses} settings={settings} />
        </ErrorBoundary>
      )}
      {tab === 'ajustes' && (
        <ErrorBoundary tab="Ajustes" onReset={() => setTab('repartir')}>
          <SettingsView
            settings={settings}
            onChange={setSettings}
            goals={goals}
            history={history}
            expenses={expenses}
            onImport={handleImport}
          />
        </ErrorBoundary>
      )}
      {tab === 'cuentas' && (
        <ErrorBoundary tab="Cuentas" onReset={() => setTab('repartir')}>
          <CuentasView history={history} expenses={expenses} rates={rates} />
        </ErrorBoundary>
      )}
      {tab === 'negocios' && (
        <ErrorBoundary tab="Negocios" onReset={() => setTab('repartir')}>
          <NegociosView
            rates={rates}
            onSurplusReady={(amount, account, reason) => {
              setBusinessSurplus({ amount, account, reason })
              setTab('repartir')
            }}
          />
        </ErrorBoundary>
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
