import type { BusinessProduct, BusinessInvestment, ExpenseEntry, Goal, IncomeEntry, Rates, Settings, AccountsReceivable } from '../types'
import { storage } from './storage'

export const DEFAULT_SETTINGS: Settings = {
  fixedExpensesUSD: 0,
  reserveMonths: 3,
  reserveSavedUSD: 0,
  risk: 'equilibrado',
  custodySplitUSD: 400,
  expensesInBs: true,
}

export const loadSettings = () => storage.loadSettings()
export const saveSettings = (s: Settings) => storage.saveSettings(s)

export const loadGoals = () => storage.loadGoals()
export const saveGoals = (g: Goal[]) => storage.saveGoals(g)

export const loadHistory = () => storage.loadHistory()
export const saveHistory = (h: IncomeEntry[]) => storage.saveHistory(h)

export const loadExpenses = () => storage.loadExpenses()
export const saveExpenses = (e: ExpenseEntry[]) => storage.saveExpenses(e)

export const loadRates = (): Rates | null => storage.loadRates()
export const saveRates = (r: Rates) => storage.saveRates(r)

export const loadBusinessProducts = () => storage.loadBusinessProducts()
export const saveBusinessProducts = (p: BusinessProduct[]) => storage.saveBusinessProducts(p)

export const loadBusinessInvestments = () => storage.loadBusinessInvestments()
export const saveBusinessInvestments = (inv: BusinessInvestment[]) => storage.saveBusinessInvestments(inv)

export const loadBusinessReceivables = () => storage.loadBusinessReceivables()
export const saveBusinessReceivables = (rc: AccountsReceivable[]) => storage.saveBusinessReceivables(rc)

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

/** Exportar respaldo completo como string JSON */
export function exportBackup(): string {
  return storage.exportBackup()
}

/** Importar respaldo desde string JSON */
export function importBackup(json: string): { ok: boolean; hadData: boolean } {
  return storage.importBackup(json)
}