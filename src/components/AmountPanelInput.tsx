/**
 * AmountPanelInput — Panel de entrada de monto (usado dentro de RepartirStepper)
 * Extraído de AmountPanel para reutilización
 */

import type { Currency, Rates } from '../types'
import {
  digits,
  groupVeAmount,
  parseAmount,
  rate as fmtRate,
  sanitizeAmountInput,
} from '../lib/format'
import { Button, SegmentedControl, Chip } from '../design'
import { IconArrow } from './icons'
import { tokens } from '../design'

export type Source = 'efectivo_usd' | 'binance' | 'banesco'

interface Props {
  amountRaw: string
  setAmountRaw: (v: string) => void
  currency: Currency
  setCurrency: (c: Currency) => void
  source: Source
  setSource: (s: Source) => void
  reason: string
  setReason: (v: string) => void
  rates: Rates
  busy: boolean
  onSubmit: () => void
}

const USD_CHIPS = [10, 20, 50, 100, 250, 500]
const VES_CHIPS = [1000, 5000, 10000, 25000, 50000, 100000]

const GUIDANCE = {
  USD: 'Entran dólares → la app consulta tasas y decide: compra USDT si conviene, deja en efectivo lo que vas a gastar.',
  VES: 'Entran bolívares → la app los valúa al paralelo y decide: compra USDT si conviene, deja en Bs lo que vas a gastar.',
}

export function AmountPanelInput({
  amountRaw,
  setAmountRaw,
  currency,
  setCurrency,
  source,
  setSource,
  reason,
  setReason,
  rates,
  busy,
  onSubmit,
}: Props) {
  const amount = parseAmount(sanitizeAmountInput(amountRaw))
  const effectiveRate = currency === 'USD' ? rates.usdtSell || rates.paralelo : rates.paralelo
  const usdValue = currency === 'USD' ? amount : amount / (rates.paralelo || 1)

  const handleType = (raw: string) => {
    if (raw === '') {
      setAmountRaw('')
      return
    }
    setAmountRaw(groupVeAmount(sanitizeAmountInput(raw)))
  }

  return (
    <section className="amount-block" aria-label="Registrar ingreso">
      <div className="field-head">
        <span className="field-title">Me cayó</span>
        <div className="segmented" role="group" aria-label="Moneda del ingreso">
          <Button
            variant={currency === 'USD' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => {
              setCurrency('USD')
              setSource('efectivo_usd')
              setAmountRaw('')
            }}
          >
            USD
          </Button>
          <Button
            variant={currency === 'VES' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => {
              setCurrency('VES')
              setSource('banesco')
              setAmountRaw('')
            }}
          >
            Bs
          </Button>
        </div>
      </div>

      <div className="amount-input">
        <span className="symbol">{currency === 'USD' ? '$' : 'Bs'}</span>
        <input
          value={amountRaw}
          onChange={(e) => handleType(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && amount > 0) onSubmit()
          }}
          inputMode="decimal"
          placeholder="0,00"
          autoComplete="off"
          name="amount"
          aria-label={currency === 'USD' ? 'Monto en dólares' : 'Monto en bolívares'}
          style={{
            flex: 1,
            minWidth: 0,
            border: 0,
            background: 'none',
            outline: 'none',
            fontSize: 'clamp(38px, 13vw, 52px)',
            fontWeight: 500,
            letterSpacing: '-0.045em',
            fontVariantNumeric: 'tabular-nums',
            padding: 0,
            fontFamily: tokens.fontFamily.mono,
          }}
        />
      </div>

      <div className="amount-equiv">
        {currency === 'USD' ? (
          <>
            <span>
              Equivale a <b>Bs {fmtRate(amount * (effectiveRate || 0))}</b> al paralelo
            </span>
            <span>
              BCV: <b>Bs {fmtRate(amount * rates.bcv)}</b>
            </span>
          </>
        ) : (
          <>
            <span>
              Vale <b>${fmtRate(usdValue)}</b> al paralelo de hoy
            </span>
            <span>
              En BCV serían <b>${fmtRate(amount / (rates.bcv || 1))}</b>
            </span>
          </>
        )}
      </div>

      <div className="guidance">{GUIDANCE[currency]}</div>

      <div className="source-row">
        <div className="chips">
          {(currency === 'USD' ? USD_CHIPS : VES_CHIPS).map((v) => (
            <Chip
              key={v}
              active={false}
              onClick={() => setAmountRaw(digits(v))}
            >
              {digits(v)}
            </Chip>
          ))}
        </div>
      </div>

      <div className="source-row">
        <span>Entró en</span>
        <SegmentedControl
          options={[
            currency === 'USD'
              ? { value: 'efectivo_usd', label: 'Efectivo' }
              : { value: 'banesco', label: 'Banesco' },
            currency === 'USD' ? { value: 'binance', label: 'Binance' } : { value: 'efectivo_bs', label: 'Bs en mano' },
          ]}
          value={source}
          onValueChange={(v: string) => setSource(v as Source)}
        />
      </div>

      <div className="form-row" style={{ marginTop: 14 }}>
        <input
          className="input"
          placeholder="¿De qué fue? Cliente, trabajo, motivo… (opcional)"
          aria-label="Motivo del ingreso"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={80}
          autoComplete="off"
          name="reason"
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

      <Button
        variant="primary"
        disabled={amount <= 0 || busy}
        onClick={onSubmit}
      >
        {busy ? 'Consultando tasas…' : 'Repartir este dinero'}
        {!busy && <IconArrow />}
      </Button>
    </section>
  )
}