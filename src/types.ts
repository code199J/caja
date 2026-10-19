export type Currency = 'USD' | 'VES'

export type AccountId = 'banesco' | 'binance' | 'efectivo_usd' | 'efectivo_bs'

export interface Rates {
  bcv: number
  paralelo: number
  usdtBuy: number
  usdtBest: number
  usdtSell: number
  bcvDrift30d: number
  fetchedAt: number
  source: 'vivo' | 'guardado'
  stale?: boolean
  error?: string
}

export type Tier = 'supervivencia' | 'ajustado' | 'normal' | 'holgado'

export type BucketId = 'gastos' | 'colchon' | 'meta' | 'libre'

export interface Bucket {
  key: string
  id: BucketId
  label: string
  usd: number
  account: AccountId
  why: string
  horizonDays: number
  goalId?: string
}

export type VerdictAction = 'comprar_usdt' | 'mixto' | 'quedarse_bs' | 'solo_gastos'

export interface Verdict {
  action: VerdictAction
  headline: string
  detail: string
  usdtAmount: number
  usdCashAmount: number
  bsToHold: number
  confidence: 'alta' | 'media' | 'baja'
  costOfHoldingBs: number
  usdtPremium: number
}

export interface Plan {
  usdTotal: number
  bsTotal: number
  bsAtBcv: number
  buckets: Bucket[]
  verdict: Verdict
  tier: Tier
  tierLabel: string
  uncoveredNeeds: number
  coveredBefore: number
  daysCovered: number
  notes: string[]
}

export interface Goal {
  id: string
  name: string
  targetUSD: number
  savedUSD: number
  deadline: string
  priority: 1 | 2 | 3
  account: AccountId
  active: boolean
}

export interface Settings {
  fixedExpensesUSD: number
  reserveMonths: number
  reserveSavedUSD: number
  risk: 'liquidez' | 'equilibrado' | 'dolarizar'
  custodySplitUSD: number
  expensesInBs: boolean
}

export interface IncomeEntry {
  id: string
  at: number
  amount: number
  currency: Currency
  rateUsed: number
  usdTotal: number
  buckets: Bucket[]
  verdictAction: VerdictAction
  note?: string
  snapshot?: { bcv: number; paralelo: number; usdtBuy: number }
  applied?: { reserve: number; goals: Array<{ id: string; usd: number }> }
}

export interface AccountMeta {
  id: AccountId
  name: string
  short: string
  currency: 'Bs' | 'USD' | 'USDT'
  risk: string
}

export const ACCOUNTS: AccountMeta[] = [
  { id: 'banesco', name: 'Banesco', short: 'Banesco', currency: 'Bs', risk: 'Se derrite con la devaluación' },
  { id: 'binance', name: 'Binance · USDT', short: 'Binance', currency: 'USDT', risk: 'Riesgo de plataforma' },
  { id: 'efectivo_usd', name: 'Efectivo USD', short: 'Efectivo', currency: 'USD', risk: 'Sin contraparte, no rinde' },
  { id: 'efectivo_bs', name: 'Efectivo Bs', short: 'Bs en mano', currency: 'Bs', risk: 'Se derrite con la devaluación' },
]

export const accountMeta = (id: AccountId): AccountMeta =>
  ACCOUNTS.find((a) => a.id === id) ?? ACCOUNTS[0]

export const EMPTY_RATES: Rates = {
  bcv: 0,
  paralelo: 0,
  usdtBuy: 0,
  usdtBest: 0,
  usdtSell: 0,
  bcvDrift30d: 0,
  fetchedAt: 0,
  source: 'guardado',
  stale: true,
}
