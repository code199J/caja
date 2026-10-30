/**
 * NegociosView — Módulo de negocio propio
 *
 * Secciones:
 *  1. Inversiones activas (con progreso de recuperación)
 *  2. Por cobrar (cuentas por cobrar pendientes)
 *  3. Productos (catálogo de productos con costo/precio)
 *
 * Flujo de cobro:
 *  - applyPayment() recupera primero la inversión, el sobrante va a caja personal
 *  - El sobrante se pre-llena en la pestaña Repartir para seguir el flujo normal
 */

import { useState, useEffect } from 'react'
import type { AccountId, Rates } from '../types'
import {
  applyPayment,
  getAvailableUnits,
} from '../engine/business'
import {
  loadBusinessProducts,
  loadBusinessInvestments, saveBusinessInvestments,
  loadBusinessReceivables, saveBusinessReceivables,
} from '../lib/store'
import { usd } from '../lib/format'
import { Card, Button, Badge, ProgressTrack, EmptyState, Modal, SegmentedControl } from '../design'
import { tokens } from '../design'

interface Props {
  rates: Rates
  onSurplusReady: (amount: number, account: string, reason: string) => void
}

export function NegociosView({ onSurplusReady }: Props) {
  const [products] = useState<any[]>(() => loadBusinessProducts())
  const [investments, setInvestments] = useState<any[]>(() => loadBusinessInvestments())
  const [receivables, setReceivables] = useState<any[]>(() => loadBusinessReceivables())

  const [openPayment, setOpenPayment] = useState(false)
  const [selectedReceivable, setSelectedReceivable] = useState<any | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [selectedAccount, setSelectedAccount] = useState<AccountId>('efectivo_usd')
  const [paymentNote, setPaymentNote] = useState('')

  // Persistir en localStorage en cada cambio
  useEffect(() => { saveBusinessInvestments(investments) }, [investments])
  useEffect(() => { saveBusinessReceivables(receivables) }, [receivables])

  const activeInvestments = investments.filter((i: any) => i.status !== 'closed')
  const pendingReceivables = receivables.filter((r: any) => r.status !== 'paid')

  const totalInvested = investments.reduce((s: number, i: any) => s + i.totalCostUSD, 0)
  const totalRecovered = investments.reduce((s: number, i: any) => s + i.recoveredUSD, 0)

  const handlePayment = (receivableId: string, paymentUSD: number, account: AccountId, note?: string) => {
    const rcIndex = receivables.findIndex((r: any) => r.id === receivableId)
    const invIndex = investments.findIndex((i: any) => i.id === receivables[rcIndex]?.investmentId)
    if (rcIndex < 0 || invIndex < 0) return

    const result = applyPayment(receivables[rcIndex], investments[invIndex], paymentUSD, account)
    setReceivables((prev: any[]) => prev.map((r) => (r.id === receivableId ? result.receivable : r)))
    setInvestments((prev: any[]) => prev.map((i) => (i.id === result.investment.id ? result.investment : i)))
    setOpenPayment(false)
    setSelectedReceivable(null)
    setPaymentAmount('')
    setPaymentNote('')

    // Notificar sobrante a caja personal para que fluya a Repartir
    if (result.toPersonalCaja > 0) {
      onSurplusReady(result.toPersonalCaja, account, note || `Cobro: ${receivables[rcIndex].client}`)
    }
  }

  const ACCOUNT_OPTIONS: Array<{ value: AccountId; label: string }> = [
    { value: 'efectivo_usd', label: 'Efectivo USD' },
    { value: 'banesco', label: 'Banesco' },
    { value: 'binance', label: 'Binance' },
  ]

  return (
    <div style={{ maxWidth: '520px', margin: '0 auto', padding: '0 16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: tokens.space[3], marginBottom: tokens.space[5] }}>
        <Card padded>
          <div style={{ fontSize: tokens.fontSize.micro, color: tokens.color.muted }}>Invertido</div>
          <div style={{ fontSize: tokens.fontSize.kpi, fontWeight: tokens.fontWeight.semibold, color: tokens.color.ink }}>{usd(totalInvested)}</div>
        </Card>
        <Card padded>
          <div style={{ fontSize: tokens.fontSize.micro, color: tokens.color.muted }}>Recuperado</div>
          <div style={{ fontSize: tokens.fontSize.kpi, fontWeight: tokens.fontWeight.semibold, color: tokens.color.constructive }}>{usd(totalRecovered)}</div>
        </Card>
      </div>

      <div style={{ marginBottom: tokens.space[5] }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.space[3] }}>
          <h2 style={{ fontSize: tokens.fontSize.section, fontWeight: tokens.fontWeight.semibold, color: tokens.color.ink }}>Inversiones activas</h2>
          <Button variant="ghost" size="sm" onClick={() => setSelectedInvestment(null)}>
            Nueva inversión
          </Button>
        </div>

        {activeInvestments.length === 0 ? (
          <EmptyState title="Aún no hay inversiones" actionLabel="Crear primera inversión" onAction={() => setSelectedInvestment(null)} />
        ) : (
          <div className="list">
            {activeInvestments.map((inv: any) => {
              const available = getAvailableUnits(inv, receivables)
              const progress = inv.totalCostUSD > 0 ? Math.min(100, (inv.recoveredUSD / inv.totalCostUSD) * 100) : 0

              return (
                <div key={inv.id} className="history-row" style={{ borderBottom: `1px solid ${tokens.color.rule}` }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <div style={{ fontSize: '16px', fontWeight: tokens.fontWeight.medium, color: tokens.color.ink }}>{inv.productName}</div>
                      <Badge variant={inv.status === 'recovered' ? 'positive' : inv.status === 'closed' ? 'neutral' : 'warning'}>
                        {inv.status === 'recovered' ? 'Recuperada' : inv.status === 'closed' ? 'Cerrada' : 'Activa'}
                      </Badge>
                    </div>
                    <div style={{ marginTop: tokens.space[1], fontSize: tokens.fontSize.small, color: tokens.color.muted }}>
                      {inv.units} unidades × {usd(inv.unitCostUSD)}/u = {usd(inv.totalCostUSD)}
                    </div>
                    <div style={{ marginTop: tokens.space[2], fontSize: tokens.fontSize.small, color: tokens.color.muted }}>
                      Recuperado {usd(inv.recoveredUSD)} de {usd(inv.totalCostUSD)} ({Math.round(progress)}%)
                    </div>
                    <ProgressTrack width={progress} />
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: tokens.fontSize.small, color: tokens.color.muted }}>Disponible</div>
                    <div style={{ fontSize: tokens.fontSize.small, fontWeight: tokens.fontWeight.medium, color: tokens.color.ink }}>{available} u.</div>
                    <Button variant="ghost" size="sm" onClick={() => {
                      const rc = receivables.find((r: any) => r.productId === inv.productId && r.status !== 'paid')
                      setSelectedReceivable(rc ?? null)
                      setOpenPayment(true)
                    }}>
                      Cobrar / Abonar
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div style={{ marginBottom: tokens.space[5] }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.space[3] }}>
          <h2 style={{ fontSize: tokens.fontSize.section, fontWeight: tokens.fontWeight.semibold, color: tokens.color.ink }}>Por cobrar</h2>
        </div>

        {pendingReceivables.length === 0 ? (
          <EmptyState title="No hay cuentas por cobrar pendientes" />
        ) : (
          <div className="list">
            {pendingReceivables.map((rc: any) => {
              const balance = rc.totalUSD - rc.paidUSD
              const daysOverdue = Math.max(0, (Date.now() - rc.agreedDate) / 86400000)
              const isOverdue = daysOverdue > 0

              return (
                <div key={rc.id} className="history-row" style={{ borderBottom: `1px solid ${tokens.color.rule}` }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <div style={{ fontSize: '16px', fontWeight: tokens.fontWeight.medium, color: tokens.color.ink }}>{rc.productName}</div>
                      <Badge variant={isOverdue ? 'negative' : 'neutral'}>
                        {rc.status === 'paid' ? 'Pagada' : rc.status === 'partial' ? 'Abono' : isOverdue ? 'Vencida' : 'Pendiente'}
                      </Badge>
                    </div>
                    <div className="goal-meta" style={{ marginTop: tokens.space[1], fontSize: tokens.fontSize.small, color: tokens.color.muted }}>
                      {rc.client} · {rc.units} u. × {usd(rc.unitPriceUSD)} = {usd(rc.totalUSD)}
                    </div>
                    <div style={{ marginTop: tokens.space[2], fontSize: tokens.fontSize.small, color: tokens.color.muted }}>
                      Saldo: <b style={{ color: isOverdue ? tokens.color.destructive : tokens.color.ink }}>{usd(balance)}</b>
                      {isOverdue && ` · ${Math.round(daysOverdue)} días vencido`}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedReceivable(rc); setOpenPayment(true) }}>
                      Cobrar / Abonar
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div>
        <h2 style={{ fontSize: tokens.fontSize.section, fontWeight: tokens.fontWeight.semibold, color: tokens.color.ink, marginBottom: tokens.space[3] }}>
          Productos
        </h2>

        {products.length === 0 ? (
          <EmptyState title="Aún no hay productos" />
        ) : (
          <div className="list">
            {products.map((p: any) => (
              <div key={p.id} className="history-row" style={{ borderBottom: `1px solid ${tokens.color.rule}` }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: tokens.fontWeight.medium, color: tokens.color.ink }}>{p.name}</div>
                  <div style={{ marginTop: tokens.space[1], fontSize: tokens.fontSize.small, color: tokens.color.muted }}>
                    Costo {usd(p.unitCostUSD)}/u · Venta {usd(p.unitPriceUSD)}/u
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Badge variant={p.active ? 'positive' : 'neutral'}>{p.active ? 'Activo' : 'Inactivo'}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Nueva inversión */}
      <Modal open={false} onClose={() => {}} title="Nueva inversión">
        <div style={{ marginTop: tokens.space[3] }}>
          <div style={{ fontSize: tokens.fontSize.small, color: tokens.color.muted }}>
            Próximamente: formulario para registrar nueva inversión de producto.
          </div>
        </div>
      </Modal>

      {/* Modal: Cobrar / Abonar */}
      <Modal open={openPayment} onClose={() => setOpenPayment(false)} title={selectedReceivable ? `Cobrar — ${selectedReceivable.client}` : ''}>
        {selectedReceivable && (
          <div style={{ marginTop: tokens.space[3] }}>
            <div style={{ marginBottom: tokens.space[3] }}>
              <div style={{ fontSize: tokens.fontSize.small, color: tokens.color.muted, marginBottom: tokens.space[1] }}>Saldo pendiente</div>
              <div style={{ fontSize: tokens.fontSize.kpi, fontWeight: tokens.fontWeight.semibold, color: tokens.color.ink }}>{usd(selectedReceivable.totalUSD - selectedReceivable.paidUSD)}</div>
            </div>

            <div style={{ marginBottom: tokens.space[3] }}>
              <div style={{ fontSize: tokens.fontSize.small, color: tokens.color.muted, marginBottom: tokens.space[1] }}>Monto a cobrar / abonar</div>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 11px',
                  fontSize: tokens.fontSize.body,
                  border: `1px solid ${tokens.color.border}`,
                  borderRadius: tokens.radius.control,
                  background: tokens.color.raised,
                  fontFamily: tokens.fontFamily.mono,
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: tokens.space[3] }}>
              <div style={{ fontSize: tokens.fontSize.small, color: tokens.color.muted, marginBottom: tokens.space[1] }}>Entró en</div>
              <SegmentedControl
                options={ACCOUNT_OPTIONS}
                value={selectedAccount}
                onValueChange={(v) => setSelectedAccount(v as AccountId)}
              />
            </div>

            <div style={{ marginBottom: tokens.space[3] }}>
              <div style={{ fontSize: tokens.fontSize.small, color: tokens.color.muted, marginBottom: tokens.space[1] }}>Nota (opcional)</div>
              <input
                type="text"
                placeholder="Abono parcial, pago completo…"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 11px',
                  fontSize: tokens.fontSize.body,
                  border: `1px solid ${tokens.color.border}`,
                  borderRadius: tokens.radius.control,
                  background: tokens.color.raised,
                  fontFamily: tokens.fontFamily.sans,
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: tokens.space[3], justifyContent: 'flex-end' }}>
              <Button variant="ghost" size="sm" onClick={() => setOpenPayment(false)}>
                Cancelar
              </Button>
              <Button variant="primary" size="sm" onClick={() => {
                const amount = parseVE(paymentAmount)
                if (amount <= 0) return
                const balance = selectedReceivable.totalUSD - selectedReceivable.paidUSD
                if (amount > balance) return
                handlePayment(selectedReceivable.id, amount, selectedAccount, paymentNote)
              }}>
                Confirmar cobro
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function parseVE(raw: string): number {
  const clean = raw.replace(/[^\d,]/g, '')
  if (!clean) return 0
  const lastComma = clean.lastIndexOf(',')
  const lastDot = clean.lastIndexOf('.')
  let normalized = clean
  if (lastComma > -1 && lastDot > -1) {
    const decimalSep = lastComma > lastDot ? ',' : '.'
    const thousandSep = decimalSep === ',' ? '.' : ','
    normalized = clean.split(thousandSep).join('').replace(decimalSep, '.')
  } else if (lastComma > -1) {
    const decimals = clean.length - lastComma - 1
    normalized = decimals === 3 ? clean.replace(/,/g, '') : clean.replace(',', '.')
  } else if (lastDot > -1) {
    const decimals = clean.length - lastDot - 1
    normalized = decimals === 3 ? clean.replace(/\./g, '') : clean
  }
  const n = Number(normalized)
  return Number.isFinite(n) ? n : 0
}

// Placeholder para setSelectedInvestment (se usa en el botón Nueva inversión)
function setSelectedInvestment(_: any) { /* no-op: modal de inversión pendiente */ }