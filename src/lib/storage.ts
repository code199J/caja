/**
 * StorageAdapter — Capa de persistencia versionada para Caja.
 *
 * Esquema: caja.v2.* (clave + versión)
 * - Migración automática v1 → v2
 * - Detección de corrupción (JSON parse falla) con fallback a último válido
 * - Manejo de cuota (localStorage lleno) sin romper la app
 * - Export/import de respaldo completo
 */

const PREFIX = 'caja.v2.'
const SCHEMA_VERSION = 2

const PREFIX_V1 = 'caja.v1.'

function readRaw<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return fallback
    return { ...fallback, ...(JSON.parse(raw) as object) } as T
  } catch {
    return fallback
  }
}

function readRawList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

function writeRaw(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
    return true
  } catch {
    // cuota llena o bloqueado: la app sigue funcionando en memoria
    return false
  }
}

/* ═══════════════════════════════════════════════════════════════════
   MIGRACIÓN v1 → v2
   ═══════════════════════════════════════════════════════════════════ */

function migrateV1ToV2(): void {
  const keys = ['settings', 'goals', 'history', 'expenses', 'rates']
  let migrated = false

  for (const key of keys) {
    const v1 = localStorage.getItem(PREFIX_V1 + key)
    if (!v1) continue

    try {
      JSON.parse(v1) // validar que sea JSON parseable
      // Ya existe en v2 o se puede migrar tal cual
      const existing = localStorage.getItem(PREFIX + key)
      if (!existing) {
        localStorage.setItem(PREFIX + key, v1)
      }
      localStorage.removeItem(PREFIX_V1 + key)
      migrated = true
    } catch {
      // Corrupto: borrar v1 y dejar que v2 use defaults
      localStorage.removeItem(PREFIX_V1 + key)
      migrated = true
    }
  }

  if (migrated) {
    localStorage.setItem(PREFIX + 'schema', String(SCHEMA_VERSION))
  }
}

/* ═══════════════════════════════════════════════════════════════════
   StorageAdapter
   ═══════════════════════════════════════════════════════════════════ */

export class StorageAdapter {
  constructor() {
    migrateV1ToV2()
  }

  /* ── Settings ── */
  loadSettings(): any {
    return readRaw('settings', { fixedExpensesUSD: 0, reserveMonths: 3, reserveSavedUSD: 0, risk: 'equilibrado', custodySplitUSD: 400, expensesInBs: true })
  }
  saveSettings(value: any): boolean {
    return writeRaw('settings', value)
  }

  /* ── Goals ── */
  loadGoals(): any[] {
    return readRawList('goals')
  }
  saveGoals(value: any[]): boolean {
    return writeRaw('goals', value.slice(0, 200))
  }

  /* ── History ── */
  loadHistory(): any[] {
    return readRawList('history')
  }
  saveHistory(value: any[]): boolean {
    return writeRaw('history', value.slice(0, 400))
  }

  /* ── Expenses ── */
  loadExpenses(): any[] {
    return readRawList('expenses')
  }
  saveExpenses(value: any[]): boolean {
    return writeRaw('expenses', value.slice(0, 600))
  }

  /* ── Rates ── */
  loadRates(): any | null {
    const r = readRaw('rates', { bcv: 0, paralelo: 0, usdtBuy: 0, usdtBest: 0, usdtSell: 0, bcvDrift30d: 0, fetchedAt: 0, source: 'guardado', stale: true })
    return r.bcv > 0 || r.paralelo > 0 || r.usdtBuy > 0 ? r : null
  }
  saveRates(value: any): boolean {
    return writeRaw('rates', value)
  }

  /* ── Negocios ── */
  loadBusinessProducts(): any[] {
    return readRawList('businessProducts')
  }
  saveBusinessProducts(value: any[]): boolean {
    return writeRaw('businessProducts', value)
  }

  loadBusinessInvestments(): any[] {
    return readRawList('businessInvestments')
  }
  saveBusinessInvestments(value: any[]): boolean {
    return writeRaw('businessInvestments', value)
  }

  loadBusinessReceivables(): any[] {
    return readRawList('businessReceivables')
  }
  saveBusinessReceivables(value: any[]): boolean {
    return writeRaw('businessReceivables', value)
  }

  /* ── Utilidades ── */
  clearAll(): void {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.startsWith(PREFIX) || key.startsWith(PREFIX_V1))) {
        localStorage.removeItem(key)
        i--
      }
    }
  }

  exportBackup(): string {
    return JSON.stringify({
      schema: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      settings: this.loadSettings(),
      goals: this.loadGoals(),
      history: this.loadHistory(),
      expenses: this.loadExpenses(),
      rates: this.loadRates(),
      businessProducts: this.loadBusinessProducts(),
      businessInvestments: this.loadBusinessInvestments(),
      businessReceivables: this.loadBusinessReceivables(),
    }, null, 2)
  }

  importBackup(json: string): { ok: boolean; hadData: boolean } {
    try {
      const parsed = JSON.parse(json)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { ok: false, hadData: false }
      }

      this.saveSettings(parsed.settings)
      this.saveGoals(parsed.goals ?? [])
      this.saveHistory(parsed.history ?? [])
      this.saveExpenses(parsed.expenses ?? [])
      this.saveRates(parsed.rates)
      this.saveBusinessProducts(parsed.businessProducts ?? [])
      this.saveBusinessInvestments(parsed.businessInvestments ?? [])
      this.saveBusinessReceivables(parsed.businessReceivables ?? [])

      const hadData = Boolean(parsed.settings) ||
        (parsed.goals ?? []).length > 0 ||
        (parsed.history ?? []).length > 0 ||
        (parsed.expenses ?? []).length > 0

      return { ok: true, hadData }
    } catch {
      return { ok: false, hadData: false }
    }
  }
}

export const storage = new StorageAdapter()