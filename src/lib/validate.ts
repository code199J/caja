import type {
  AccountId,
  Bucket,
  CategoryId,
  Currency,
  ExpenseEntry,
  Goal,
  IncomeEntry,
  Settings,
  VerdictAction,
} from '../types'
import { ACCOUNTS, EXPENSE_CATEGORIES } from '../types'

/**
 * Validación de respaldos importados: nada entra al estado sin pasar por aquí.
 * Un respaldo dañado o editado a mano nunca debe corromper los números.
 */

const MAX = 10_000_000
const now = () => Date.now()

const asNum = (v: unknown, fallback = 0) =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))
const asStr = (v: unknown, max = 120) =>
  typeof v === 'string' ? v.trim().slice(0, max) : ''
const asBool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback)

const isAccount = (v: unknown): v is AccountId =>
  typeof v === 'string' && ACCOUNTS.some((a) => a.id === v)
const isCategory = (v: unknown): v is CategoryId =>
  typeof v === 'string' && EXPENSE_CATEGORIES.some((c) => c.id === v)
const isCurrency = (v: unknown): v is Currency => v === 'USD' || v === 'VES'
const isTimestamp = (v: unknown) => asNum(v, -1) >= 0 && asNum(v) <= now() + 86_400_000

function sanitizeSettings(raw: unknown): Settings {
  const s = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const risk = ['liquidez', 'equilibrado', 'dolarizar'].includes(String(s.risk))
    ? (s.risk as Settings['risk'])
    : 'equilibrado'
  return {
    fixedExpensesUSD: clamp(asNum(s.fixedExpensesUSD), 0, MAX),
    reserveMonths: Math.round(clamp(asNum(s.reserveMonths, 3), 0, 24)),
    reserveSavedUSD: clamp(asNum(s.reserveSavedUSD), 0, MAX),
    risk,
    custodySplitUSD: clamp(asNum(s.custodySplitUSD, 400), 0, MAX),
    expensesInBs: asBool(s.expensesInBs, true),
  }
}

function sanitizeGoals(raw: unknown): Goal[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((g): g is Record<string, unknown> => Boolean(g) && typeof g === 'object')
    .map((g, i) => ({
      id: asStr(g.id) || `imp-g${i}-${now().toString(36)}`,
      name: asStr(g.name) || 'Meta sin nombre',
      targetUSD: clamp(asNum(g.targetUSD), 0.01, MAX),
      savedUSD: clamp(asNum(g.savedUSD), 0, MAX),
      deadline: /^\d{4}-\d{2}-\d{2}$/.test(String(g.deadline))
        ? String(g.deadline)
        : new Date(now() + 90 * 86400000).toISOString().slice(0, 10),
      priority: (clamp(asNum(g.priority, 2), 1, 3) as Goal['priority']),
      account: isAccount(g.account) ? g.account : 'binance',
      active: asBool(g.active, true),
    }))
    .slice(0, 200)
}

function sanitizeBuckets(raw: unknown): Bucket[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((b): b is Record<string, unknown> => Boolean(b) && typeof b === 'object')
    .map((b, i) => ({
      key: asStr(b.key) || `imp-b${i}`,
      id: (['gastos', 'colchon', 'meta', 'libre'] as const).includes(b.id as Bucket['id'])
        ? (b.id as Bucket['id'])
        : 'libre',
      label: asStr(b.label) || 'Destino',
      usd: clamp(asNum(b.usd), 0, MAX),
      account: isAccount(b.account) ? b.account : 'banesco',
      why: asStr(b.why, 200),
      horizonDays: Math.round(clamp(asNum(b.horizonDays, 30), 0, 3650)),
      goalId: asStr(b.goalId, 40) || undefined,
    }))
}

function sanitizeHistory(raw: unknown): IncomeEntry[] {
  if (!Array.isArray(raw)) return []
  const out: IncomeEntry[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const h = item as Record<string, unknown>
    const amount = asNum(h.amount)
    const usdTotal = clamp(asNum(h.usdTotal), 0, MAX)
    if (amount <= 0 || usdTotal <= 0) continue
    const appliedRaw =
      h.applied && typeof h.applied === 'object' ? (h.applied as Record<string, unknown>) : undefined
    const goalsRaw = Array.isArray(appliedRaw?.goals) ? appliedRaw.goals : []
    out.push({
      id: asStr(h.id) || `imp-h${out.length}-${now().toString(36)}`,
      at: isTimestamp(h.at) ? asNum(h.at) : now(),
      amount,
      currency: isCurrency(h.currency) ? h.currency : 'USD',
      rateUsed: clamp(asNum(h.rateUsed, 1), 0, MAX),
      usdTotal,
      buckets: sanitizeBuckets(h.buckets),
      verdictAction: (['comprar_usdt', 'mixto', 'quedarse_bs', 'solo_gastos'] as const).includes(
        h.verdictAction as VerdictAction,
      )
        ? (h.verdictAction as VerdictAction)
        : 'mixto',
      note: asStr(h.note) || undefined,
      applied: appliedRaw
        ? {
            reserve: clamp(asNum(appliedRaw.reserve), 0, MAX),
            goals: goalsRaw
              .filter((g) => Boolean(g) && typeof g === 'object')
              .map((g) => {
                const rec = g as Record<string, unknown>
                return { id: asStr(rec.id, 40), usd: clamp(asNum(rec.usd), 0, MAX) }
              })
              .filter((g) => g.id),
          }
        : undefined,
    })
  }
  return out.slice(0, 400)
}

function sanitizeExpenses(raw: unknown, fallbackRate: number): ExpenseEntry[] {
  if (!Array.isArray(raw)) return []
  const out: ExpenseEntry[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const e = item as Record<string, unknown>
    const amount = asNum(e.amount)
    if (amount <= 0) continue
    const currency = isCurrency(e.currency) ? e.currency : 'USD'
    const parsed = clamp(asNum(e.usdAtRate), 0, MAX)
    const usdAtRate =
      currency === 'USD'
        ? amount
        : parsed > 0
          ? parsed
          : fallbackRate > 0
            ? amount / fallbackRate
            : 0
    if (usdAtRate <= 0) continue
    out.push({
      id: asStr(e.id) || `imp-e${out.length}-${now().toString(36)}`,
      at: isTimestamp(e.at) ? asNum(e.at) : now(),
      amount,
      currency,
      category: isCategory(e.category) ? e.category : 'otros',
      reason: asStr(e.reason) || 'Gasto importado',
      paidFrom: isAccount(e.paidFrom) ? e.paidFrom : 'banesco',
      usdAtRate,
    })
  }
  return out.slice(0, 600)
}

export interface SanitizedBackup {
  settings: Settings
  goals: Goal[]
  history: IncomeEntry[]
  expenses: ExpenseEntry[]
  hadData: boolean
}

export function sanitizeBackup(raw: unknown, fallbackRate: number): SanitizedBackup | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const src = raw as Record<string, unknown>
  const settings = sanitizeSettings(src.settings)
  const goals = sanitizeGoals(src.goals)
  const history = sanitizeHistory(src.history)
  const expenses = sanitizeExpenses(src.expenses, fallbackRate)
  const hadData =
    Boolean(src.settings) || goals.length > 0 || history.length > 0 || expenses.length > 0
  return { settings, goals, history, expenses, hadData }
}
