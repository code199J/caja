import { describe, it, expect } from 'vitest'
import { buildPlan } from '../allocate'
import type { Rates, Settings, Currency, Goal } from '../../types'

const baseRates: Rates = {
  bcv: 36,
  paralelo: 42,
  usdtBuy: 43,
  usdtBest: 42,
  usdtSell: 41,
  bcvDrift30d: 5,
  fetchedAt: Date.now(),
  source: 'vivo',
}

const baseSettings: Settings = {
  fixedExpensesUSD: 300,
  reserveMonths: 3,
  reserveSavedUSD: 0,
  risk: 'equilibrado',
  custodySplitUSD: 400,
  expensesInBs: true,
}

const baseGoals: Goal[] = []

function makeInput(overrides: Partial<{
  amount: number
  currency: Currency
  rates: Rates
  settings: Settings
  goals: Goal[]
  coveredBefore: number
}> = {}) {
  return {
    amount: overrides.amount ?? 300,
    currency: overrides.currency ?? 'USD',
    rates: overrides.rates ?? baseRates,
    settings: overrides.settings ?? baseSettings,
    goals: overrides.goals ?? baseGoals,
    coveredBefore: overrides.coveredBefore ?? 0,
  }
}

describe('buildPlan tiers', () => {
  it('supervivencia: ingreso menor a un tercio del mes', () => {
    const plan = buildPlan(makeInput({ amount: 50 }))
    expect(plan.tier).toBe('supervivencia')
    expect(plan.buckets.find((b) => b.id === 'gastos')?.usd).toBe(50)
  })

  it('ajustado: entre un tercio y el 85%', () => {
    const plan = buildPlan(makeInput({ amount: 150 }))
    expect(plan.tier).toBe('ajustado')
  })

  it('normal: entre 0.85 y 2x los gastos fijos', () => {
    const plan = buildPlan(makeInput({ amount: 400 }))
    expect(plan.tier).toBe('normal')
  })

  it('holgado: más de 2x los gastos fijos', () => {
    const plan = buildPlan(makeInput({ amount: 700 }))
    expect(plan.tier).toBe('holgado')
  })
})

describe('buildPlan risk profiles', () => {
  it('liquidez prioriza colchón y libre sobre metas', () => {
    const plan = buildPlan(makeInput({
      amount: 1000,
      settings: { ...baseSettings, risk: 'liquidez' },
    }))

    const colchon = plan.buckets.filter((b) => b.id === 'colchon').reduce((s, b) => s + b.usd, 0)
    const libre = plan.buckets.filter((b) => b.id === 'libre').reduce((s, b) => s + b.usd, 0)
    const metas = plan.buckets.filter((b) => b.id === 'meta').reduce((s, b) => s + b.usd, 0)

    // Con liquidez, más va a colchón y libre
    expect(colchon).toBeGreaterThan(0)
    expect(libre).toBeGreaterThan(0)
    expect(metas).toBeLessThan(colchon)
  })

  it('dolarizar prioriza metas y colchón sobre libre (menos libre que equilibrio)', () => {
    const goals: Goal[] = [
      {
        id: 'g1',
        name: 'Meta test',
        targetUSD: 500,
        savedUSD: 0,
        deadline: new Date(Date.now() + 86400000 * 60).toISOString().slice(0, 10),
        priority: 2,
        account: 'binance',
        active: true,
      },
    ]

    const planDolarizar = buildPlan(makeInput({
      amount: 1000,
      settings: { ...baseSettings, risk: 'dolarizar' },
      goals,
    }))

    const planEquilibrio = buildPlan(makeInput({
      amount: 1000,
      settings: { ...baseSettings, risk: 'equilibrado' },
      goals,
    }))

    const libreDolarizar = planDolarizar.buckets.filter((b) => b.id === 'libre').reduce((s, b) => s + b.usd, 0)
    const libreEquilibrio = planEquilibrio.buckets.filter((b) => b.id === 'libre').reduce((s, b) => s + b.usd, 0)

    expect(libreDolarizar).toBeLessThan(libreEquilibrio)
  })
})

describe('buildPlan custody split', () => {
  it('divide colchón entre binance y efectivo cuando supera custodySplitUSD', () => {
    const plan = buildPlan(makeInput({
      amount: 5000,
      settings: { ...baseSettings, custodySplitUSD: 400 },
    }))

    const binanceColchon = plan.buckets.filter((b) => b.id === 'colchon' && b.account === 'binance').reduce((s, b) => s + b.usd, 0)
    const efectivoColchon = plan.buckets.filter((b) => b.id === 'colchon' && b.account === 'efectivo_usd').reduce((s, b) => s + b.usd, 0)

    expect(binanceColchon).toBeGreaterThan(0)
    expect(efectivoColchon).toBeGreaterThan(0)
  })
})

describe('buildPlan goals', () => {
  it('sin metas activas, el dinero de metas va a caja libre con nota', () => {
    const plan = buildPlan(makeInput({ amount: 1000 }))

    const libre = plan.buckets.filter((b) => b.id === 'libre').reduce((s, b) => s + b.usd, 0)
    expect(libre).toBeGreaterThan(0)
    expect(plan.notes.some((n) => n.includes('No tienes metas activas'))).toBe(true)
  })

  it('con meta activa, se abona primero a la más urgente', () => {
    const goals: Goal[] = [
      {
        id: 'g1',
        name: 'Laptop',
        targetUSD: 1000,
        savedUSD: 0,
        deadline: new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10),
        priority: 1,
        account: 'binance',
        active: true,
      },
    ]

    const plan = buildPlan(makeInput({ amount: 1000, goals }))

    const metaBuckets = plan.buckets.filter((b) => b.id === 'meta')
    expect(metaBuckets.length).toBeGreaterThan(0)
    expect(metaBuckets[0].label).toBe('Laptop')
  })
})

describe('buildPlan stale rates', () => {
  it('marca confianza baja cuando las tasas están viejas', () => {
    const plan = buildPlan(makeInput({
      amount: 500,
      rates: { ...baseRates, fetchedAt: Date.now() - 100000000, stale: true },
    }))

    expect(plan.verdict.confidence).toBe('baja')
    expect(plan.notes.some((n) => n.includes('tasas son las últimas guardadas'))).toBe(true)
  })
})

describe('buildPlan VES income', () => {
  it('convierte bolívares a USD usando la tasa paralela', () => {
    const plan = buildPlan(makeInput({
      amount: 42000, // 42.000 Bs
      currency: 'VES',
      rates: { ...baseRates, paralelo: 42 },
    }))

    expect(plan.usdTotal).toBeCloseTo(1000, 0)
  })
})
