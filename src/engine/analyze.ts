import type { CategoryId, ExpenseEntry, IncomeEntry } from '../types'
import { categoryMeta } from '../types'
import { monthKeyLocal, monthLabel } from '../lib/format'

export interface Movement {
  id: string
  at: number
  kind: 'ingreso' | 'egreso'
  usd: number
  amount: number
  currency: 'USD' | 'VES'
  label: string
  sub?: string
}

/** Combina ingresos y egresos en una lista ordenada (más reciente primero) */
export function allMovements(history: IncomeEntry[], expenses: ExpenseEntry[]): Movement[] {
  const ingresos: Movement[] = history.map((h) => ({
    id: h.id,
    at: h.at,
    kind: 'ingreso',
    usd: h.usdTotal,
    amount: h.amount,
    currency: h.currency,
    label: h.note?.trim() || 'Ingreso repartido',
    sub: 'repartido',
  }))
  const egresos: Movement[] = expenses.map((e) => ({
    id: e.id,
    at: e.at,
    kind: 'egreso',
    usd: e.usdAtRate,
    amount: e.amount,
    currency: e.currency,
    label: e.reason?.trim() || categoryMeta(e.category).name,
    sub: categoryMeta(e.category).name,
  }))
  return [...ingresos, ...egresos].sort((a, b) => b.at - a.at)
}

export interface CategorySlice {
  id: CategoryId
  name: string
  usd: number
  pct: number
  count: number
}

export interface MonthStats {
  inUSD: number
  outUSD: number
  net: number
  byCategory: CategorySlice[]
  top: Array<{ label: string; category: string; usd: number; at: number }>
  daysActive: number
  avgDaily: number
  biggestSlice?: CategorySlice
}

export function monthsWithData(history: IncomeEntry[], expenses: ExpenseEntry[]) {
  const keys = new Set<string>()
  for (const h of history) keys.add(monthKeyLocal(h.at))
  for (const e of expenses) keys.add(monthKeyLocal(e.at))
  return [...keys].sort().reverse().slice(0, 12)
}

export function monthStats(
  monthKey: string,
  history: IncomeEntry[],
  expenses: ExpenseEntry[],
): MonthStats {
  const inMonth = (at: number) => monthKeyLocal(at) === monthKey

  const incomes = history.filter((h) => inMonth(h.at))
  const spends = expenses.filter((e) => inMonth(e.at))

  const inUSD = incomes.reduce((s, h) => s + h.usdTotal, 0)
  const outUSD = spends.reduce((s, e) => s + e.usdAtRate, 0)

  const byId = new Map<CategoryId, { usd: number; count: number }>()
  for (const e of spends) {
    const cur = byId.get(e.category) ?? { usd: 0, count: 0 }
    cur.usd += e.usdAtRate
    cur.count += 1
    byId.set(e.category, cur)
  }
  const byCategory: CategorySlice[] = [...byId.entries()]
    .map(([id, v]) => ({
      id,
      name: categoryMeta(id).name,
      usd: v.usd,
      count: v.count,
      pct: outUSD > 0 ? (v.usd / outUSD) * 100 : 0,
    }))
    .sort((a, b) => b.usd - a.usd)

  const top = [...spends]
    .sort((a, b) => b.usdAtRate - a.usdAtRate)
    .slice(0, 4)
    .map((e) => ({
      label: e.reason?.trim() || categoryMeta(e.category).name,
      category: categoryMeta(e.category).name,
      usd: e.usdAtRate,
      at: e.at,
    }))

  const daysActive = new Set(spends.map((e) => new Date(e.at).toDateString())).size
  const now = new Date()
  const isCurrent = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}` === monthKey
  // para el mes en curso cuenta los días transcurridos; para meses cerrados, 30
  const basis = Math.max(1, isCurrent ? now.getDate() : 30)

  return {
    inUSD,
    outUSD,
    net: inUSD - outUSD,
    byCategory,
    top,
    daysActive,
    avgDaily: outUSD / basis,
    biggestSlice: byCategory[0],
  }
}

export { monthLabel }
