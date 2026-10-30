/**
 * RepartirStepper — Flujo de 3 pasos: Ingreso → Vista previa → Confirmar
 * Reemplaza el layout único anterior en la pestaña 'repartir'
 */

import { useState, useEffect } from 'react'
import type { Currency, IncomeEntry, Rates, Settings } from '../types'
import type { Source } from './AmountPanel'
import { buildPlan } from '../engine/allocate'
import { parseAmount, sanitizeAmountInput, usd, digits } from '../lib/format'
import { Card, Button, ProgressTrack } from '../design'
import { tokens } from '../design'
import { AmountPanelInput } from './AmountPanelInput'

interface PlanInputLocal {
  amount: number
  currency: Currency
  rates: Rates
  settings: Settings
  goals: { id: string; name: string; targetUSD: number; savedUSD: number; active: boolean }[]
  coveredBefore: number
}

interface Props {
  rates: Rates
  settings: Settings
  goals: { id: string; name: string; targetUSD: number; savedUSD: number; active: boolean }[]
  history: IncomeEntry[]
  businessSurplus: { amount: number; account: string; reason: string } | null
  onClearSurplus: () => void
  onRegister: (data: {
    amount: number
    currency: Currency
    rateUsed: number
    usdTotal: number
    buckets: { id: string; usd: number }[]
    verdictAction: string
    reason: string
    snapshot: { bcv: number; paralelo: number; usdtBuy: number }
  }) => void
  loadingRates: boolean
}

export function RepartirStepper({
  rates,
  settings,
  goals,
  history,
  businessSurplus,
  onClearSurplus,
  onRegister,
  loadingRates,
}: Props) {
  const [step, setStep] = useState<'input' | 'preview' | 'confirm'>('input')
  const [amountRaw, setAmountRaw] = useState('')
  const [currency, setCurrency] = useState<Currency>('USD')
  const [source, setSource] = useState<Source>('efectivo_usd')
  const [reason, setReason] = useState('')
  const [plan, setPlan] = useState<ReturnType<typeof buildPlan> | null>(null)

  const amount = parseAmount(sanitizeAmountInput(amountRaw))
  const covered = history
    .filter((h) => {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
      const startOfNext = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime()
      return h.at >= start && h.at < startOfNext
    })
    .reduce((total, h) => {
      const gastos = h.buckets
        .filter((b) => b.id === 'gastos')
        .reduce((sum, b) => sum + b.usd, 0)
      return total + gastos
    }, 0)

  const recompute = () => {
    const input: PlanInputLocal = {
      amount,
      currency,
      rates,
      settings,
      goals,
      coveredBefore: covered,
    }
    setPlan(buildPlan(input as any))
  }

  const handleSubmitInput = () => {
    if (amount <= 0 || loadingRates) return
    recompute()
    setStep('preview')
  }

  // Pre-llenar cuando llega un sobrante de negocio
  useEffect(() => {
    if (!businessSurplus) return
    setAmountRaw(digits(businessSurplus.amount))
    setCurrency('USD')
    setSource(businessSurplus.account as Source)
    setReason(businessSurplus.reason)
    setStep('preview')
    recompute()
  }, [businessSurplus])

  // Limpiar surplus después de registrar
  const handleRegisterWithClear = () => {
    if (!plan) return
    const rateUsed = currency === 'VES' ? rates.paralelo : 1
    onRegister({
      amount,
      currency,
      rateUsed,
      usdTotal: plan.usdTotal,
      buckets: plan.buckets,
      verdictAction: plan.verdict.action,
      reason,
      snapshot: { bcv: rates.bcv, paralelo: rates.paralelo, usdtBuy: rates.usdtBuy },
    })
    onClearSurplus()
    setStep('confirm')
  }

  const handleRegister = () => {
    if (!plan) return
    const rateUsed = currency === 'VES' ? rates.paralelo : 1
    onRegister({
      amount,
      currency,
      rateUsed,
      usdTotal: plan.usdTotal,
      buckets: plan.buckets,
      verdictAction: plan.verdict.action,
      reason,
      snapshot: { bcv: rates.bcv, paralelo: rates.paralelo, usdtBuy: rates.usdtBuy },
    })
    setStep('confirm')
  }

  const handleNewIncome = () => {
    setAmountRaw('')
    setReason('')
    setPlan(null)
    setStep('input')
    onClearSurplus()
  }

  const progress = step === 'input' ? 33 : step === 'preview' ? 66 : 100

  const stepLabel = {
    input: '1. Ingreso',
    preview: '2. Vista previa',
    confirm: '3. Confirmado',
  }[step]

  return (
    <div>
      <div style={{ marginBottom: tokens.space[4] }}>
        <ProgressTrack width={progress} color={tokens.color.primary} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: tokens.space[2], fontSize: tokens.fontSize.micro, color: tokens.color.muted }}>
          <span>{stepLabel}</span>
          <span>{plan ? usd(plan.usdTotal) : ''}</span>
        </div>
      </div>

      {step === 'input' && (
        <AmountPanelInput
          amountRaw={amountRaw}
          setAmountRaw={setAmountRaw}
          currency={currency}
          setCurrency={setCurrency}
          source={source}
          setSource={setSource}
          reason={reason}
          setReason={setReason}
          rates={rates}
          busy={loadingRates}
          onSubmit={handleSubmitInput}
        />
      )}

      {step === 'preview' && plan && (
        <div>
          <Card padded style={{ marginBottom: tokens.space[4] }}>
            <div style={{ fontSize: tokens.fontSize.section, fontWeight: tokens.fontWeight.semibold, color: tokens.color.ink, marginBottom: tokens.space[3] }}>
              Reparto de {usd(plan.usdTotal)}
            </div>
            <div style={{ display: 'flex', gap: tokens.space[2] }}>
              {plan.buckets.map((b) => (
                <div key={b.key} style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ height: 8, borderRadius: tokens.radius.control, background: tokens.color.raised, marginBottom: tokens.space[1], overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.max(2, (b.usd / plan.usdTotal) * 100)}%`,
                        background:
                          b.id === 'meta' ? tokens.color.meta :
                          b.id === 'colchon' ? '#5c635b' :
                          b.id === 'gastos' ? tokens.color.ink :
                          tokens.color.control,
                      }}
                    />
                  </div>
                  <div style={{ fontSize: tokens.fontSize.micro, color: tokens.color.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.label}</div>
                  <div style={{ fontSize: tokens.fontSize.small, fontWeight: tokens.fontWeight.medium, color: tokens.color.ink }}>{usd(b.usd)}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: tokens.space[3], fontSize: tokens.fontSize.small, color: tokens.color.faint }}>
              {plan.verdict.headline}
            </div>
          </Card>

          <div style={{ display: 'flex', gap: tokens.space[3], justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setStep('input')}>
              Editar monto
            </Button>
            <Button variant="primary" onClick={businessSurplus ? handleRegisterWithClear : handleRegister}>
              Confirmar y guardar
            </Button>
          </div>
        </div>
      )}

      {step === 'confirm' && (
        <div style={{ textAlign: 'center', padding: tokens.space[6] }}>
          <div style={{ fontSize: tokens.fontSize.section, fontWeight: tokens.fontWeight.semibold, color: tokens.color.ink, marginBottom: tokens.space[2] }}>
            ¡Guardado!
          </div>
          <div style={{ fontSize: tokens.fontSize.small, color: tokens.color.muted, marginBottom: tokens.space[4] }}>
            Tu reparto se ha registrado correctamente.
          </div>
          <Button variant="primary" onClick={handleNewIncome}>
            Otro ingreso
          </Button>
        </div>
      )}
    </div>
  )
}