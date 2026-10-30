import { describe, it, expect } from 'vitest'
import {
  createInvestment,
  createReceivable,
  applyPayment,
  getAvailableUnits,
  calculateInvestmentROI,
  getInvestmentStatus,
} from '../business'

const baseRates = { bcv: 36, paralelo: 42, usdtBuy: 43 } as any

describe('createInvestment', () => {
  it('crea una inversión con totales correctos', () => {
    const inv = createInvestment({
      productId: 'prod-1',
      productName: 'Camisas polo',
      units: 50,
      unitCostUSD: 6,
      fundedFrom: 'efectivo_usd',
    })

    expect(inv.id).toBeDefined()
    expect(inv.totalCostUSD).toBe(300)
    expect(inv.recoveredUSD).toBe(0)
    expect(inv.status).toBe('active')
    expect(inv.units).toBe(50)
  })
})

describe('createReceivable', () => {
  it('convierte VES a USD usando la tasa paralela', () => {
    const rc = createReceivable({
      investmentId: 'inv-1',
      productId: 'prod-1',
      productName: 'Camisas polo',
      client: 'Carlos',
      units: 10,
      unitPriceUSD: 12,
      currency: 'VES',
      agreedDate: Date.now() + 86400000 * 30,
      rates: baseRates,
    })

    // 10 * 12 / 42 = 2.857...
    expect(rc.totalUSD).toBeCloseTo(2.857, 2)
    expect(rc.status).toBe('pending')
    expect(rc.paidUSD).toBe(0)
  })

  it('usa tasa 1 para USD', () => {
    const rc = createReceivable({
      investmentId: 'inv-1',
      productId: 'prod-1',
      productName: 'Camisas polo',
      client: 'Carlos',
      units: 10,
      unitPriceUSD: 12,
      currency: 'USD',
      agreedDate: Date.now() + 86400000 * 30,
      rates: baseRates,
    })

    expect(rc.totalUSD).toBe(120)
  })
})

describe('applyPayment', () => {
  const inv = {
    id: 'inv-1',
    productId: 'prod-1',
    productName: 'Camisas polo',
    units: 50,
    unitCostUSD: 6,
    totalCostUSD: 300,
    fundedFrom: 'efectivo_usd' as const,
    fundedAt: Date.now(),
    recoveredUSD: 180,
    status: 'active' as const,
    createdAt: Date.now(),
  }

  const rc = {
    id: 'rc-1',
    investmentId: 'inv-1',
    productId: 'prod-1',
    productName: 'Camisas polo',
    client: 'Carlos',
    units: 10,
    unitPriceUSD: 12,
    currency: 'USD' as const,
    totalUSD: 120,
    agreedDate: Date.now() + 86400000 * 30,
    paidUSD: 0,
    status: 'pending' as const,
    createdAt: Date.now(),
    payments: [],
  }

  it('aplica primero a la inversión y el sobrante va a caja personal', () => {
    const result = applyPayment(rc, inv, 200, 'efectivo_usd')

    // Faltaban 120 para recuperar la inversión (300 - 180)
    expect(result.toInvestment).toBe(120)
    expect(result.toPersonalCaja).toBe(80) // 200 - 120
    expect(result.investment.recoveredUSD).toBe(300)
    expect(result.investment.status).toBe('recovered')
    expect(result.receivable.paidUSD).toBe(200)
    expect(result.receivable.status).toBe('paid')
  })

  it('pago parcial solo va a la inversión', () => {
    const result = applyPayment(rc, inv, 100, 'efectivo_usd')

    expect(result.toInvestment).toBe(100)
    expect(result.toPersonalCaja).toBe(0)
    expect(result.investment.recoveredUSD).toBe(280)
    expect(result.investment.status).toBe('active')
    expect(result.receivable.status).toBe('partial')
  })

  it('pago sobre inversión ya recuperada va todo a caja personal', () => {
    const invRecovered = { ...inv, recoveredUSD: 300, status: 'recovered' as const }
    const result = applyPayment(rc, invRecovered, 100, 'efectivo_usd')

    expect(result.toInvestment).toBe(0)
    expect(result.toPersonalCaja).toBe(100)
  })
})

describe('getAvailableUnits', () => {
  it('calcula unidades disponibles restando CxC pendientes', () => {
    const inv = {
      id: 'inv-1',
      units: 50,
      totalCostUSD: 300,
      recoveredUSD: 0,
      status: 'active' as const,
    } as any

    const receivables = [
      { id: 'rc-1', investmentId: 'inv-1', units: 10, status: 'pending' as const },
      { id: 'rc-2', investmentId: 'inv-1', units: 15, status: 'partial' as const },
      { id: 'rc-3', investmentId: 'inv-1', units: 5, status: 'paid' as const },
    ] as any[]

    expect(getAvailableUnits(inv, receivables)).toBe(25) // 50 - 10 - 15
  })
})

describe('calculateInvestmentROI', () => {
  it('calcula ROI y días de recuperación', () => {
    const inv = {
      id: 'inv-1',
      totalCostUSD: 300,
      recoveredUSD: 150,
      status: 'active' as const,
    } as any

    const receivables = [
      { id: 'rc-1', investmentId: 'inv-1', totalUSD: 200, paidUSD: 0, status: 'pending' as const, createdAt: Date.now() - 86400000 * 10, payments: [{ at: Date.now() - 86400000 * 5 }] },
    ] as any[]

    const roi = calculateInvestmentROI(inv, receivables)

    expect(roi.roi).toBe(50) // 150/300 * 100
    expect(roi.pendingUSD).toBe(150)
  })
})

describe('getInvestmentStatus', () => {
  it('devuelve closed cuando todas las unidades vendidas Y todas las CxC pagadas', () => {
    const inv = { id: 'inv-1', status: 'active' as const, recoveredUSD: 300, totalCostUSD: 300, units: 10 } as any
    const receivables = [
      { id: 'rc-1', investmentId: 'inv-1', status: 'paid' as const, units: 5 },
      { id: 'rc-2', investmentId: 'inv-1', status: 'paid' as const, units: 5 },
    ] as any[]

    expect(getInvestmentStatus(inv, receivables)).toBe('closed')
  })

  it('devuelve active cuando hay CxC pendientes', () => {
    const inv = { id: 'inv-1', status: 'active' as const, recoveredUSD: 100, totalCostUSD: 300, units: 10 } as any
    const receivables = [
      { id: 'rc-1', investmentId: 'inv-1', status: 'pending' as const, units: 5 },
    ] as any[]

    expect(getInvestmentStatus(inv, receivables)).toBe('active')
  })

  it('devuelve recovered si se recuperó el costo pero faltan unidades por vender', () => {
    const inv = { id: 'inv-1', status: 'active' as const, recoveredUSD: 300, totalCostUSD: 300, units: 10 } as any
    const receivables = [
      { id: 'rc-1', investmentId: 'inv-1', status: 'paid' as const, units: 5 },
    ] as any[]

    expect(getInvestmentStatus(inv, receivables)).toBe('recovered')
  })

  it('devuelve active si no se han vendido todas las unidades aunque estén pagadas', () => {
    const inv = { id: 'inv-1', status: 'active' as const, recoveredUSD: 150, totalCostUSD: 300, units: 10 } as any
    const receivables = [
      { id: 'rc-1', investmentId: 'inv-1', status: 'paid' as const, units: 5 },
    ] as any[]

    expect(getInvestmentStatus(inv, receivables)).toBe('active')
  })
})
