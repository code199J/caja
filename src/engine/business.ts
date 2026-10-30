/**
 * Negocios Engine — Funciones puras para el módulo de negocio.
 *
 * Flujo:
 *  1. createInvestment: registras cuánto invertiste en un producto (sale de tus cuentas personales)
 *  2. createReceivable: registras una venta a crédito (cuenta por cobrar) ligada a esa inversión
 *  3. applyPayment: cuando te pagan, primero se recupera la inversión; el sobrante va a tu caja personal
 *  4. getAvailableUnits: cuántas unidades aún puedes vender sin exceder la inversión
 */

import type {
  AccountId,
  BusinessInvestment,
  Currency,
  AccountsReceivable,
  Payment,
  Rates,
} from '../types'
import { newId } from '../lib/store'

/* ─────────────────────────────────────────────────────────────
   createInvestment
   ───────────────────────────────────────────────────────────── */

export interface CreateInvestmentInput {
  productId: string
  productName: string
  units: number
  unitCostUSD: number
  fundedFrom: AccountId
  fundedAt?: number
  expectedSalePriceUSD?: number
  expectedSaleCurrency?: 'USD' | 'VES' | 'USDT'
}

export function createInvestment(input: CreateInvestmentInput): BusinessInvestment {
  const now = input.fundedAt ?? Date.now()
  const totalCostUSD = input.units * input.unitCostUSD
  return {
    id: newId(),
    productId: input.productId,
    productName: input.productName,
    units: input.units,
    unitCostUSD: input.unitCostUSD,
    totalCostUSD,
    fundedFrom: input.fundedFrom,
    fundedAt: now,
    recoveredUSD: 0,
    status: 'active',
    createdAt: now,
    expectedSalePriceUSD: input.expectedSalePriceUSD,
    expectedSaleCurrency: input.expectedSaleCurrency,
  }
}

/* ─────────────────────────────────────────────────────────────
   createReceivable
   ───────────────────────────────────────────────────────────── */

export interface CreateReceivableInput {
  investmentId: string
  productId: string
  productName: string
  client: string
  units: number
  unitPriceUSD: number
  currency: Currency
  agreedDate: number
  rates: Rates
}

export function createReceivable(input: CreateReceivableInput): AccountsReceivable {
  const now = Date.now()
  const rate = input.currency === 'VES' ? (input.rates.paralelo || input.rates.bcv || 1) : 1
  const totalUSD = input.units * input.unitPriceUSD / rate

  return {
    id: newId(),
    investmentId: input.investmentId,
    productId: input.productId,
    productName: input.productName,
    client: input.client,
    units: input.units,
    unitPriceUSD: input.unitPriceUSD,
    currency: input.currency,
    totalUSD,
    agreedDate: input.agreedDate,
    paidUSD: 0,
    status: 'pending',
    createdAt: now,
    payments: [],
  }
}

/* ─────────────────────────────────────────────────────────────
   applyPayment — CORAZÓN del módulo
   ─────────────────────────────────────────────────────────────
   Cuando recibes un pago:
   1. Primero se recupera la inversión pendiente (totalCost - recovered)
   2. El sobrante (surplus) va a tu caja personal para Repartir
   3. Si la inversión se recupera completamente, status = 'recovered'
   4. Si la CxC se paga completamente, status = 'paid'
   5. Retorna cuánto va a inversión y cuánto a caja personal
 */

export interface ApplyPaymentResult {
  receivable: AccountsReceivable
  investment: BusinessInvestment
  toInvestment: number      // monto aplicado a recuperar inversión
  toPersonalCaja: number    // sobrante que va a Repartir (caja personal)
}

export function applyPayment(
  receivable: AccountsReceivable,
  investment: BusinessInvestment,
  paymentUSD: number,
  account: AccountId,
  at?: number,
  note?: string,
): ApplyPaymentResult {
  const now = at ?? Date.now()

  // 1. Cuánto falta por recuperar de la inversión
  const missingFromInvestment = investment.totalCostUSD - investment.recoveredUSD
  const toInvestment = Math.min(paymentUSD, missingFromInvestment)

  // 2. Sobrante para caja personal
  const toPersonalCaja = Math.max(0, paymentUSD - toInvestment)

  // 3. Actualizar inversión
  const newRecovered = investment.recoveredUSD + toInvestment
  const newInvestmentStatus =
    newRecovered >= investment.totalCostUSD ? 'recovered' : investment.status

  const updatedInvestment: BusinessInvestment = {
    ...investment,
    recoveredUSD: newRecovered,
    status: newInvestmentStatus,
  }

  // 4. Actualizar cuenta por cobrar
  const newPaid = receivable.paidUSD + paymentUSD
  const newReceivableStatus =
    newPaid >= receivable.totalUSD ? 'paid' :
    newPaid > 0 ? 'partial' : receivable.status

  const payment: Payment = {
    id: newId(),
    receivableId: receivable.id,
    amountUSD: paymentUSD,
    currency: 'USD', // el pago se registra en USD base
    rateUsed: 1,
    account,
    at: now,
    note,
  }

  const updatedReceivable: AccountsReceivable = {
    ...receivable,
    paidUSD: newPaid,
    status: newReceivableStatus,
    payments: [...receivable.payments, payment],
  }

  // 5. Si todas las CxC de esta inversión están pagadas, cerrar inversión
  // (esto se verifica desde afuera con getInvestmentStatus)

  return {
    receivable: updatedReceivable,
    investment: updatedInvestment,
    toInvestment,
    toPersonalCaja,
  }
}

/* ─────────────────────────────────────────────────────────────
   getAvailableUnits
   ─────────────────────────────────────────────────────────────
   Cuántas unidades de una inversión aún están disponibles para vender
   (unidades totales menos unidades en cuentas por cobrar no pagadas)
 */

export function getAvailableUnits(
  investment: BusinessInvestment,
  receivables: AccountsReceivable[],
): number {
  const linked = receivables.filter((r) => r.investmentId === investment.id && r.status !== 'paid')
  const unitsInReceivables = linked.reduce((s, r) => s + r.units, 0)
  return Math.max(0, investment.units - unitsInReceivables)
}

/* ─────────────────────────────────────────────────────────────
   getReceivablesAging
   ─────────────────────────────────────────────────────────────
   Clasifica cuentas por cobrar por días de vencimiento
 */

export interface AgingBucket {
  label: string
  minDays: number
  maxDays?: number
  receivables: AccountsReceivable[]
  totalUSD: number
}

export function getReceivablesAging(
  receivables: AccountsReceivable[],
  today: number = Date.now(),
): AgingBucket[] {
  const buckets: AgingBucket[] = [
    { label: 'Vigentes', minDays: 0, maxDays: 0, receivables: [], totalUSD: 0 },
    { label: '1-30 días', minDays: 1, maxDays: 30, receivables: [], totalUSD: 0 },
    { label: '31-60 días', minDays: 31, maxDays: 60, receivables: [], totalUSD: 0 },
    { label: '61-90 días', minDays: 61, maxDays: 90, receivables: [], totalUSD: 0 },
    { label: '+90 días', minDays: 91, receivables: [], totalUSD: 0 },
  ]

  const nowDays = today / 86400000

  for (const r of receivables) {
    if (r.status === 'paid') continue
    const agreedDays = r.agreedDate / 86400000
    const daysOverdue = Math.max(0, nowDays - agreedDays)

    let bucketIndex = 0
    if (daysOverdue <= 0) bucketIndex = 0
    else if (daysOverdue <= 30) bucketIndex = 1
    else if (daysOverdue <= 60) bucketIndex = 2
    else if (daysOverdue <= 90) bucketIndex = 3
    else bucketIndex = 4

    buckets[bucketIndex].receivables.push(r)
    buckets[bucketIndex].totalUSD += r.totalUSD - r.paidUSD
  }

  return buckets
}

/* ─────────────────────────────────────────────────────────────
   calculateInvestmentROI
   ───────────────────────────────────────────────────────────── */

export interface InvestmentROI {
  roi: number           // porcentaje de retorno
  paybackDays: number   // días estimados para recuperar
  recoveredUSD: number
  totalCostUSD: number
  pendingUSD: number
}

export function calculateInvestmentROI(
  investment: BusinessInvestment,
  receivables: AccountsReceivable[],
): InvestmentROI {
  const pending = investment.totalCostUSD - investment.recoveredUSD
  const totalReceivableUSD = receivables
    .filter((r) => r.investmentId === investment.id)
    .reduce((s, r) => s + (r.totalUSD - r.paidUSD), 0)

  const roi = investment.totalCostUSD > 0
    ? ((investment.recoveredUSD / investment.totalCostUSD) * 100)
    : 0

  // Días estimados: promedio de días entre creación de CxC y ahora, para las pagadas
  const paidReceivables = receivables.filter((r) => r.investmentId === investment.id && r.status === 'paid')
  const avgDaysToPay = paidReceivables.length > 0
    ? paidReceivables.reduce((s, r) => {
        const lastPayment = r.payments[r.payments.length - 1]
        return s + ((lastPayment?.at ?? r.createdAt) - r.createdAt) / 86400000
      }, 0) / paidReceivables.length
    : 30

  const paybackDays = pending > 0 && totalReceivableUSD > 0
    ? Math.ceil((pending / totalReceivableUSD) * avgDaysToPay)
    : 0

  return { roi, paybackDays, recoveredUSD: investment.recoveredUSD, totalCostUSD: investment.totalCostUSD, pendingUSD: pending }
}

/* ─────────────────────────────────────────────────────────────
   getInvestmentStatus — determina si una inversión está cerrada
   ───────────────────────────────────────────────────────────── */

export function getInvestmentStatus(
  investment: BusinessInvestment,
  receivables: AccountsReceivable[],
): 'active' | 'recovered' | 'closed' {
  if (investment.status === 'closed') return 'closed'
  const linkedReceivables = receivables.filter((r) => r.investmentId === investment.id)
  const allPaid = linkedReceivables.length > 0 && linkedReceivables.every((r) => r.status === 'paid')
  if (allPaid) return 'closed'
  return investment.recoveredUSD >= investment.totalCostUSD ? 'recovered' : 'active'
}