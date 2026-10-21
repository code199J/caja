import type { ExpenseEntry, Goal, IncomeEntry, Rates, Settings } from '../types'
import { EMPTY_RATES } from '../types'

const PREFIX = 'caja.v1.'
function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return fallback
    return { ...fallback, ...(JSON.parse(raw) as object) } as T
  } catch {
    return fallback
  }
}

function readList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    /* almacenamiento lleno o bloqueado: la app sigue funcionando en memoria */
  }
}

export const DEFAULT_SETTINGS: Settings = {
  fixedExpensesUSD: 0,
  reserveMonths: 3,
  reserveSavedUSD: 0,
  risk: 'equilibrado',
  custodySplitUSD: 400,
  expensesInBs: true,
}

export const loadSettings = () => read<Settings>('settings', DEFAULT_SETTINGS)
export const saveSettings = (s: Settings) => write('settings', s)

export const loadGoals = () => readList<Goal>('goals')
export const saveGoals = (g: Goal[]) => write('goals', g)

export const loadHistory = () => readList<IncomeEntry>('history')
export const saveHistory = (h: IncomeEntry[]) => write('history', h.slice(0, 400))

export const loadExpenses = () => readList<ExpenseEntry>('expenses')
export const saveExpenses = (e: ExpenseEntry[]) => write('expenses', e.slice(0, 600))

export const loadRates = (): Rates | null => {
  const r = read<Rates>('rates', EMPTY_RATES)
  return r.bcv > 0 || r.paralelo > 0 || r.usdtBuy > 0 ? r : null
}
export const saveRates = (r: Rates) => write('rates', r)

export const newId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

/** Lo que ya se cubrió del mes en curso con los ingresos registrados */
export function coveredThisMonth(history: IncomeEntry[]) {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const startOfNext = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime()
  return history
    .filter((h) => h.at >= start && h.at < startOfNext)
    .reduce((total, h) => {
      const gastos = h.buckets
        .filter((b) => b.id === 'gastos')
        .reduce((sum, b) => sum + b.usd, 0)
      return total + gastos
    }, 0)
}
