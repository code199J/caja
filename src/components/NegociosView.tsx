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
import type {
  AccountId,
  Rates,
  Currency,
  BusinessProduct,
  BusinessInvestment,
  AccountsReceivable,
} from '../types'
import {
  applyPayment,
  createInvestment,
  createReceivable,
  getAvailableUnits,
  getInvestmentStatus,
} from '../engine/business'
import {
  loadBusinessProducts,
  saveBusinessProducts,
  loadBusinessInvestments,
  saveBusinessInvestments,
  loadBusinessReceivables,
  saveBusinessReceivables,
} from '../lib/store'
import { usd, parseAmount, todayISO } from '../lib/format'
import {
  Card,
  Button,
  Badge,
  ProgressTrack,
  EmptyState,
  Modal,
  SegmentedControl,
  Input,
  Select,
} from '../design'
import { tokens } from '../design'

interface Props {
  rates: Rates
  onSurplusReady: (amount: number, account: string, reason: string) => void
}

const ACCOUNT_OPTIONS: Array<{ value: AccountId; label: string }> = [
  { value: 'efectivo_usd', label: 'Efectivo USD' },
  { value: 'banesco', label: 'Banesco' },
  { value: 'binance', label: 'Binance' },
]

const CURRENCY_OPTIONS: Array<{ value: Currency; label: string }> = [
  { value: 'USD', label: 'USD' },
  { value: 'VES', label: 'Bs' },
]

export function NegociosView({ rates, onSurplusReady }: Props) {
  const [products, setProducts] = useState<BusinessProduct[]>(() => loadBusinessProducts())
  const [investments, setInvestments] = useState<BusinessInvestment[]>(() => loadBusinessInvestments())
  const [receivables, setReceivables] = useState<AccountsReceivable[]>(() => loadBusinessReceivables())

  // Persistir en localStorage en cada cambio
  useEffect(() => { saveBusinessProducts(products) }, [products])
  useEffect(() => { saveBusinessInvestments(investments) }, [investments])
  useEffect(() => { saveBusinessReceivables(receivables) }, [receivables])

  /* ───────────── Modales ───────────── */
  const [openInvestment, setOpenInvestment] = useState(false)
  const [openProduct, setOpenProduct] = useState(false)
  const [openSale, setOpenSale] = useState(false)
  const [openPayment, setOpenPayment] = useState(false)

  /* ───────────── Nueva inversión ───────────── */
  const [invName, setInvName] = useState('')
  const [invUnits, setInvUnits] = useState('')
  const [invUnitCost, setInvUnitCost] = useState('')
  const [invFundedFrom, setInvFundedFrom] = useState<AccountId>('efectivo_usd')

  /* ───────────── Nuevo producto ───────────── */
  const [prodName, setProdName] = useState('')
  const [prodCost, setProdCost] = useState('')
  const [prodPrice, setProdPrice] = useState('')
  const [prodCurrency, setProdCurrency] = useState<Currency>('USD')
  const [prodActive, setProdActive] = useState(true)

  /* ───────────── Venta a crédito ───────────── */
  const [saleInvestmentId, setSaleInvestmentId] = useState<string>('')
  const [saleClient, setSaleClient] = useState('')
  const [saleUnits, setSaleUnits] = useState('')
  const [salePrice, setSalePrice] = useState('')
  const [saleCurrency, setSaleCurrency] = useState<Currency>('USD')
  const [saleAgreedDate, setSaleAgreedDate] = useState(todayISO())

  /* ───────────── Cobro / Abono ───────────── */
  const [selectedReceivable, setSelectedReceivable] = useState<AccountsReceivable | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [selectedAccount, setSelectedAccount] = useState<AccountId>('efectivo_usd')
  const [paymentNote, setPaymentNote] = useState('')

  /* ───────────── Derivados ───────────── */
  const activeInvestments = investments.filter((i) => i.status !== 'closed')
  const pendingReceivables = receivables.filter((r) => r.status !== 'paid')

  const totalInvested = investments.reduce((s, i) => s + i.totalCostUSD, 0)
  const totalRecovered = investments.reduce((s, i) => s + i.recoveredUSD, 0)

  /* ───────────── Handlers ───────────── */

  const handleCreateProduct = () => {
    const cost = parseAmount(prodCost)
    const price = parseAmount(prodPrice)
    if (!prodName.trim() || cost <= 0 || price <= 0) return
    const product: BusinessProduct = {
      id: crypto.randomUUID(),
      name: prodName.trim(),
      unitCostUSD: cost,
      unitPriceUSD: price,
      currency: prodCurrency,
      active: prodActive,
      createdAt: Date.now(),
    }
    setProducts((prev) => [...prev, product])
    setProdName('')
    setProdCost('')
    setProdPrice('')
    setProdCurrency('USD')
    setProdActive(true)
    setOpenProduct(false)
  }

  const handleCreateInvestment = () => {
    const units = Number(invUnits)
    const unitCost = parseAmount(invUnitCost)
    if (!invName.trim() || !units || units <= 0 || unitCost <= 0) return
    const investment = createInvestment({
      productId: crypto.randomUUID(),
      productName: invName.trim(),
      units,
      unitCostUSD: unitCost,
      fundedFrom: invFundedFrom,
    })
    setInvestments((prev) => [...prev, investment])
    setInvName('')
    setInvUnits('')
    setInvUnitCost('')
    setInvFundedFrom('efectivo_usd')
    setOpenInvestment(false)
  }

  const handleCreateSale = () => {
    const investment = investments.find((i) => i.id === saleInvestmentId)
    if (!investment) return
    const available = getAvailableUnits(investment, receivables)
    const units = Number(saleUnits)
    const price = parseAmount(salePrice)
    if (!saleClient.trim() || !units || units <= 0 || units > available || price <= 0) return
    const receivable = createReceivable({
      investmentId: investment.id,
      productId: investment.productId,
      productName: investment.productName,
      client: saleClient.trim(),
      units,
      unitPriceUSD: price,
      currency: saleCurrency,
      agreedDate: new Date(saleAgreedDate).getTime(),
      rates,
    })
    setReceivables((prev) => [...prev, receivable])
    setSaleInvestmentId('')
    setSaleClient('')
    setSaleUnits('')
    setSalePrice('')
    setSaleCurrency('USD')
    setSaleAgreedDate(todayISO())
    setOpenSale(false)
  }

  const handlePayment = () => {
    if (!selectedReceivable) return
    const rcIndex = receivables.findIndex((r) => r.id === selectedReceivable.id)
    const invIndex = investments.findIndex((i) => i.id === receivables[rcIndex]?.investmentId)
    if (rcIndex < 0 || invIndex < 0) return

    const amount = parseAmount(paymentAmount)
    if (amount <= 0) return
    const balance = receivables[rcIndex].totalUSD - receivables[rcIndex].paidUSD
    if (amount > balance) return

    const result = applyPayment(
      receivables[rcIndex],
      investments[invIndex],
      amount,
      selectedAccount,
      Date.now(),
      paymentNote || undefined,
    )

    const nextReceivables = receivables.map((r) => (r.id === selectedReceivable.id ? result.receivable : r))

    const nextInvestments = investments.map((i) => {
      if (i.id === result.investment.id) {
        const status = getInvestmentStatus(result.investment, nextReceivables.filter((r) => r.investmentId === i.id))
        return { ...result.investment, status }
      }
      return i
    })

    setReceivables(nextReceivables)
    setInvestments(nextInvestments)
    setOpenPayment(false)
    setSelectedReceivable(null)
    setPaymentAmount('')
    setPaymentNote('')

    // Notificar sobrante a caja personal para que fluya a Repartir
    if (result.toPersonalCaja > 0) {
      onSurplusReady(result.toPersonalCaja, selectedAccount, paymentNote || `Cobro: ${receivables[rcIndex].client}`)
    }
  }

  const handleOpenPayment = (rc: AccountsReceivable | null) => {
    if (!rc) return
    setSelectedReceivable(rc)
    setPaymentAmount('')
    setSelectedAccount('efectivo_usd')
    setPaymentNote('')
    setOpenPayment(true)
  }

  /* ───────────── Preview de cobro ───────────── */
  let previewToInvestment = 0
  let previewToPersonal = 0
  if (selectedReceivable) {
    const amount = parseAmount(paymentAmount)
    const balance = selectedReceivable.totalUSD - selectedReceivable.paidUSD
    const pay = Math.min(Math.max(0, amount), balance)
    const inv = investments.find((i) => i.id === selectedReceivable.investmentId)
    if (inv) {
      const missing = inv.totalCostUSD - inv.recoveredUSD
      previewToInvestment = Math.min(pay, missing)
      previewToPersonal = Math.max(0, pay - previewToInvestment)
    }
  }

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

      {/* ───────────── Inversiones activas ───────────── */}
      <div style={{ marginBottom: tokens.space[5] }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.space[3] }}>
          <h2 style={{ fontSize: tokens.fontSize.section, fontWeight: tokens.fontWeight.semibold, color: tokens.color.ink }}>Inversiones activas</h2>
          <Button variant="ghost" size="sm" onClick={() => setOpenInvestment(true)}>
            Nueva inversión
          </Button>
        </div>

        {activeInvestments.length === 0 ? (
          <EmptyState title="Aún no hay inversiones" actionLabel="Crear primera inversión" onAction={() => setOpenInvestment(true)} />
        ) : (
          <div className="list">
            {activeInvestments.map((inv) => {
              const available = getAvailableUnits(inv, receivables)
              const progress = inv.totalCostUSD > 0 ? Math.min(100, (inv.recoveredUSD / inv.totalCostUSD) * 100) : 0
              const linkedReceivables = receivables.filter((r) => r.investmentId === inv.id)
              const hasPendingCxC = linkedReceivables.some((r) => r.status !== 'paid')

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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const rc = receivables.find((r) => r.investmentId === inv.id && r.status !== 'paid')
                        handleOpenPayment(rc ?? null)
                      }}
                      disabled={!hasPendingCxC}
                    >
                      Cobrar / Abonar
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ───────────── Por cobrar ───────────── */}
      <div style={{ marginBottom: tokens.space[5] }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.space[3] }}>
          <h2 style={{ fontSize: tokens.fontSize.section, fontWeight: tokens.fontWeight.semibold, color: tokens.color.ink }}>Por cobrar</h2>
          <Button variant="ghost" size="sm" onClick={() => setOpenSale(true)} disabled={activeInvestments.length === 0}>
            Nueva venta a crédito
          </Button>
        </div>

        {pendingReceivables.length === 0 ? (
          <EmptyState title="No hay cuentas por cobrar pendientes" />
        ) : (
          <div className="list">
            {pendingReceivables.map((rc) => {
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
                    <Button variant="ghost" size="sm" onClick={() => handleOpenPayment(rc)}>
                      Cobrar / Abonar
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ───────────── Productos ───────────── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.space[3] }}>
          <h2 style={{ fontSize: tokens.fontSize.section, fontWeight: tokens.fontWeight.semibold, color: tokens.color.ink }}>Productos</h2>
          <Button variant="ghost" size="sm" onClick={() => setOpenProduct(true)}>
            Nuevo producto
          </Button>
        </div>

        {products.length === 0 ? (
          <EmptyState title="Aún no hay productos" />
        ) : (
          <div className="list">
            {products.map((p) => (
              <div key={p.id} className="history-row" style={{ borderBottom: `1px solid ${tokens.color.rule}` }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: tokens.fontWeight.medium, color: tokens.color.ink }}>{p.name}</div>
                  <div style={{ marginTop: tokens.space[1], fontSize: tokens.fontSize.small, color: tokens.color.muted }}>
                    Costo {usd(p.unitCostUSD)}/u · Venta {usd(p.unitPriceUSD)}/u · {p.currency}
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

      {/* ───────────── Modal: Nueva inversión ───────────── */}
      <Modal open={openInvestment} onClose={() => setOpenInvestment(false)} title="Nueva inversión">
        <div style={{ marginTop: tokens.space[3] }}>
          <div style={{ marginBottom: tokens.space[3] }}>
            <div style={{ fontSize: tokens.fontSize.small, color: tokens.color.muted, marginBottom: tokens.space[1] }}>Nombre de la inversión</div>
            <Input type="text" placeholder="Ej. Compra de mercadería" value={invName} onChange={(e) => setInvName(e.target.value)} />
          </div>

          <div style={{ marginBottom: tokens.space[3] }}>
            <div style={{ fontSize: tokens.fontSize.small, color: tokens.color.muted, marginBottom: tokens.space[1] }}>Unidades</div>
            <Input type="text" inputMode="decimal" placeholder="0" value={invUnits} onChange={(e) => setInvUnits(e.target.value)} />
          </div>

          <div style={{ marginBottom: tokens.space[3] }}>
            <div style={{ fontSize: tokens.fontSize.small, color: tokens.color.muted, marginBottom: tokens.space[1] }}>Costo por unidad (USD)</div>
            <Input type="text" inputMode="decimal" placeholder="0,00" value={invUnitCost} onChange={(e) => setInvUnitCost(e.target.value)} />
          </div>

          <div style={{ marginBottom: tokens.space[3] }}>
            <div style={{ fontSize: tokens.fontSize.small, color: tokens.color.muted, marginBottom: tokens.space[1] }}>Entró en</div>
            <SegmentedControl options={ACCOUNT_OPTIONS} value={invFundedFrom} onValueChange={(v) => setInvFundedFrom(v as AccountId)} />
          </div>

          <div style={{ display: 'flex', gap: tokens.space[3], justifyContent: 'flex-end' }}>
            <Button variant="ghost" size="sm" onClick={() => setOpenInvestment(false)}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateInvestment}>
              Registrar inversión
            </Button>
          </div>
        </div>
      </Modal>

      {/* ───────────── Modal: Nuevo producto ───────────── */}
      <Modal open={openProduct} onClose={() => setOpenProduct(false)} title="Nuevo producto">
        <div style={{ marginTop: tokens.space[3] }}>
          <div style={{ marginBottom: tokens.space[3] }}>
            <div style={{ fontSize: tokens.fontSize.small, color: tokens.color.muted, marginBottom: tokens.space[1] }}>Nombre</div>
            <Input type="text" placeholder="Ej. Camisa polo" value={prodName} onChange={(e) => setProdName(e.target.value)} />
          </div>

          <div style={{ marginBottom: tokens.space[3] }}>
            <div style={{ fontSize: tokens.fontSize.small, color: tokens.color.muted, marginBottom: tokens.space[1] }}>Costo por unidad (USD)</div>
            <Input type="text" inputMode="decimal" placeholder="0,00" value={prodCost} onChange={(e) => setProdCost(e.target.value)} />
          </div>

          <div style={{ marginBottom: tokens.space[3] }}>
            <div style={{ fontSize: tokens.fontSize.small, color: tokens.color.muted, marginBottom: tokens.space[1] }}>Precio de venta (USD)</div>
            <Input type="text" inputMode="decimal" placeholder="0,00" value={prodPrice} onChange={(e) => setProdPrice(e.target.value)} />
          </div>

          <div style={{ marginBottom: tokens.space[3] }}>
            <div style={{ fontSize: tokens.fontSize.small, color: tokens.color.muted, marginBottom: tokens.space[1] }}>Moneda</div>
            <Select value={prodCurrency} onChange={(e) => setProdCurrency(e.target.value as Currency)}>
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>

          <div style={{ marginBottom: tokens.space[3] }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: tokens.space[2], cursor: 'pointer' }}>
              <input type="checkbox" checked={prodActive} onChange={(e) => setProdActive(e.target.checked)} style={{ margin: 0 }} />
              Activo para vender
            </label>
          </div>

          <div style={{ display: 'flex', gap: tokens.space[3], justifyContent: 'flex-end' }}>
            <Button variant="ghost" size="sm" onClick={() => setOpenProduct(false)}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateProduct}>
              Guardar producto
            </Button>
          </div>
        </div>
      </Modal>

      {/* ───────────── Modal: Venta a crédito ───────────── */}
      <Modal open={openSale} onClose={() => setOpenSale(false)} title="Nueva venta a crédito">
        <div style={{ marginTop: tokens.space[3] }}>
          <div style={{ marginBottom: tokens.space[3] }}>
            <div style={{ fontSize: tokens.fontSize.small, color: tokens.color.muted, marginBottom: tokens.space[1] }}>Inversión (producto)</div>
            <Select value={saleInvestmentId} onChange={(e) => setSaleInvestmentId(e.target.value)}>
              <option value="">Seleccionar inversión…</option>
              {activeInvestments.map((inv) => {
                const available = getAvailableUnits(inv, receivables)
                return (
                  <option key={inv.id} value={inv.id} disabled={available <= 0}>
                    {inv.productName} — {available} u. disponibles
                  </option>
                )
              })}
            </Select>
            {activeInvestments.length === 0 && (
              <div style={{ marginTop: tokens.space[1], fontSize: tokens.fontSize.micro, color: tokens.color.muted }}>
                Crea primero una inversión.
              </div>
            )}
          </div>

          <div style={{ marginBottom: tokens.space[3] }}>
            <div style={{ fontSize: tokens.fontSize.small, color: tokens.color.muted, marginBottom: tokens.space[1] }}>Cliente</div>
            <Input type="text" placeholder="Ej. Juan Pérez" value={saleClient} onChange={(e) => setSaleClient(e.target.value)} />
          </div>

          <div style={{ marginBottom: tokens.space[3] }}>
            <div style={{ fontSize: tokens.fontSize.small, color: tokens.color.muted, marginBottom: tokens.space[1] }}>Unidades</div>
            <Input type="text" inputMode="decimal" placeholder="0" value={saleUnits} onChange={(e) => setSaleUnits(e.target.value)} />
          </div>

          <div style={{ marginBottom: tokens.space[3] }}>
            <div style={{ fontSize: tokens.fontSize.small, color: tokens.color.muted, marginBottom: tokens.space[1] }}>Precio de venta por unidad (USD)</div>
            <Input type="text" inputMode="decimal" placeholder="0,00" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
          </div>

          <div style={{ marginBottom: tokens.space[3] }}>
            <div style={{ fontSize: tokens.fontSize.small, color: tokens.color.muted, marginBottom: tokens.space[1] }}>Moneda</div>
            <Select value={saleCurrency} onChange={(e) => setSaleCurrency(e.target.value as Currency)}>
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>

          <div style={{ marginBottom: tokens.space[3] }}>
            <div style={{ fontSize: tokens.fontSize.small, color: tokens.color.muted, marginBottom: tokens.space[1] }}>Fecha de acuerdo</div>
            <Input type="date" value={saleAgreedDate} onChange={(e) => setSaleAgreedDate(e.target.value)} />
          </div>

          <div style={{ display: 'flex', gap: tokens.space[3], justifyContent: 'flex-end' }}>
            <Button variant="ghost" size="sm" onClick={() => setOpenSale(false)}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateSale} disabled={activeInvestments.length === 0}>
              Registrar venta
            </Button>
          </div>
        </div>
      </Modal>

      {/* ───────────── Modal: Cobrar / Abonar ───────────── */}
      <Modal open={openPayment} onClose={() => setOpenPayment(false)} title={selectedReceivable ? `Cobrar — ${selectedReceivable.client}` : ''}>
        {selectedReceivable && (
          <div style={{ marginTop: tokens.space[3] }}>
            <div style={{ marginBottom: tokens.space[3] }}>
              <div style={{ fontSize: tokens.fontSize.small, color: tokens.color.muted, marginBottom: tokens.space[1] }}>Saldo pendiente</div>
              <div style={{ fontSize: tokens.fontSize.kpi, fontWeight: tokens.fontWeight.semibold, color: tokens.color.ink }}>{usd(selectedReceivable.totalUSD - selectedReceivable.paidUSD)}</div>
            </div>

            <div style={{ marginBottom: tokens.space[3] }}>
              <div style={{ fontSize: tokens.fontSize.small, color: tokens.color.muted, marginBottom: tokens.space[1] }}>Monto a cobrar / abonar</div>
              <Input type="text" inputMode="decimal" placeholder="0,00" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
              <div style={{ marginTop: tokens.space[1], fontSize: tokens.fontSize.micro, color: tokens.color.muted }}>
                Máximo: {usd(selectedReceivable.totalUSD - selectedReceivable.paidUSD)}
              </div>
            </div>

            <div style={{ marginBottom: tokens.space[3] }}>
              <div style={{ fontSize: tokens.fontSize.small, color: tokens.color.muted, marginBottom: tokens.space[1] }}>Entró en</div>
              <SegmentedControl options={ACCOUNT_OPTIONS} value={selectedAccount} onValueChange={(v) => setSelectedAccount(v as AccountId)} />
            </div>

            <div style={{ marginBottom: tokens.space[3] }}>
              <div style={{ fontSize: tokens.fontSize.small, color: tokens.color.muted, marginBottom: tokens.space[1] }}>Nota (opcional)</div>
              <Input type="text" placeholder="Abono parcial, pago completo…" value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} />
            </div>

            {previewToInvestment > 0 || previewToPersonal > 0 ? (
              <div style={{ marginBottom: tokens.space[3], padding: tokens.space[3], background: tokens.color.raised, borderRadius: tokens.radius.control, border: `1px solid ${tokens.color.border}` }}>
                <div style={{ fontSize: tokens.fontSize.small, color: tokens.color.muted, marginBottom: tokens.space[1] }}>Se aplicará:</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: tokens.fontSize.small, fontWeight: tokens.fontWeight.medium }}>
                  <span>{usd(previewToInvestment)} a inversión</span>
                  <span>{usd(previewToPersonal)} a tu caja libre</span>
                </div>
              </div>
            ) : null}

            <div style={{ display: 'flex', gap: tokens.space[3], justifyContent: 'flex-end' }}>
              <Button variant="ghost" size="sm" onClick={() => setOpenPayment(false)}>
                Cancelar
              </Button>
              <Button variant="primary" size="sm" onClick={handlePayment} disabled={parseAmount(paymentAmount) <= 0}>
                Confirmar cobro
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
