import type { Currency, Rates } from '../types'
import {
  digits,
  groupVeAmount,
  parseAmount,
  rate as fmtRate,
  sanitizeAmountInput,
} from '../lib/format'
import { IconArrow } from './icons'

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

export function AmountPanel({
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
          <button
            aria-pressed={currency === 'USD'}
            onClick={() => {
              setCurrency('USD')
              setSource('efectivo_usd')
              setAmountRaw('')
            }}
          >
            USD
          </button>
          <button
            aria-pressed={currency === 'VES'}
            onClick={() => {
              setCurrency('VES')
              setSource('banesco')
              setAmountRaw('')
            }}
          >
            Bs
          </button>
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

      <div className="source-row">
        <div className="chips">
          {(currency === 'USD' ? USD_CHIPS : VES_CHIPS).map((v) => (
            <button
              key={v}
              className="chip"
              onClick={() => setAmountRaw(digits(v))}
              aria-label={`Usar ${v}`}
            >
              {digits(v)}
            </button>
          ))}
        </div>
      </div>

      <div className="source-row">
        <span>Entró en</span>
        <div className="segmented" role="group" aria-label="Dónde entró el dinero">
          {currency === 'USD' ? (
            <>
              <button
                aria-pressed={source === 'efectivo_usd'}
                onClick={() => setSource('efectivo_usd')}
              >
                Efectivo
              </button>
              <button aria-pressed={source === 'binance'} onClick={() => setSource('binance')}>
                Binance
              </button>
            </>
          ) : (
            <button aria-pressed={source === 'banesco'} onClick={() => setSource('banesco')}>
              Banesco
            </button>
          )}
        </div>
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
        />
      </div>

      <button className="primary" disabled={amount <= 0 || busy} onClick={onSubmit}>
        {busy ? 'Consultando tasas…' : 'Repartir este dinero'}
        {!busy && <IconArrow />}
      </button>
    </section>
  )
}
