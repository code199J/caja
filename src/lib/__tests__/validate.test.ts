import { describe, it, expect } from 'vitest'
import { sanitizeBackup } from '../validate'

describe('sanitizeBackup', () => {
  it('rechaza payload no objeto', () => {
    expect(sanitizeBackup(null, 42)).toBeNull()
    expect(sanitizeBackup([1, 2, 3], 42)).toBeNull()
    expect(sanitizeBackup('texto', 42)).toBeNull()
  })

  it('limpia settings con valores fuera de rango', () => {
    const result = sanitizeBackup(
      {
        settings: {
          fixedExpensesUSD: -100,
          reserveMonths: 999,
          reserveSavedUSD: -50,
          risk: 'invalido',
          custodySplitUSD: -10,
          expensesInBs: true,
        },
      },
      42
    )

    expect(result).not.toBeNull()
    expect(result!.settings.fixedExpensesUSD).toBe(0)
    expect(result!.settings.reserveMonths).toBe(24) // clamped to max
    expect(result!.settings.reserveSavedUSD).toBe(0)
    expect(result!.settings.risk).toBe('equilibrado') // default for invalid
    expect(result!.settings.custodySplitUSD).toBe(0) // clamp a 0 (no puede ser negativo)
  })

  it('limpia goals con datos inválidos', () => {
    const result = sanitizeBackup(
      {
        goals: [
          { id: '', name: '', targetUSD: -10, savedUSD: -5, deadline: 'not-a-date', priority: 9, account: 'no-existe', active: true },
          { id: 'g1', name: 'Meta válida', targetUSD: 500, savedUSD: 100, deadline: '2026-12-31', priority: 2, account: 'binance', active: true },
        ],
        history: [],
        expenses: [],
      },
      42
    )

    expect(result).not.toBeNull()
    expect(result!.goals.length).toBe(2)
    expect(result!.goals[0].name).toBe('Meta sin nombre')
    expect(result!.goals[0].targetUSD).toBeGreaterThan(0)
    expect(result!.goals[1].name).toBe('Meta válida')
  })

  it('limpia history rechazando montos negativos', () => {
    const result = sanitizeBackup(
      {
        history: [
          { id: 'h1', amount: -100, usdTotal: 50, currency: 'USD', buckets: [], at: Date.now() },
          { id: 'h2', amount: 100, usdTotal: 100, currency: 'USD', buckets: [], at: Date.now() },
        ],
        goals: [],
        expenses: [],
      },
      42
    )

    expect(result).not.toBeNull()
    expect(result!.history.length).toBe(1)
    expect(result!.history[0].id).toBe('h2')
  })

  it('limpia expenses rechazando montos <= 0', () => {
    const result = sanitizeBackup(
      {
        expenses: [
          { id: 'e1', amount: 0, currency: 'USD', category: 'comida', paidFrom: 'banesco', usdAtRate: 0, at: Date.now() },
          { id: 'e2', amount: 50, currency: 'USD', category: 'comida', paidFrom: 'banesco', usdAtRate: 50, at: Date.now() },
        ],
        goals: [],
        history: [],
      },
      42
    )

    expect(result).not.toBeNull()
    expect(result!.expenses.length).toBe(1)
    expect(result!.expenses[0].id).toBe('e2')
  })

  it('hadData es true cuando hay algo válido', () => {
    const result = sanitizeBackup({ settings: {} }, 42)
    expect(result!.hadData).toBe(true)

    const empty = sanitizeBackup({}, 42)
    expect(empty!.hadData).toBe(false)
  })
})
