import type { Bucket, Currency, Plan, Rates } from '../types'
import { accountMeta } from '../types'
import { bs, digits, pct, rate as fmtRate, usd } from '../lib/format'
import type { Source } from './AmountPanel'
import { IconCheck } from './icons'

const COLOR: Record<Bucket['id'], string> = {
  gastos: '#141815',           // ink
  colchon: '#5c635b',          // mid grey (neutro)
  meta: '#E5404F',             // guayaba - THE hue (main data element)
  libre: '#c9cdc0',            // light grey
}

function bucketSub(b: Bucket, rates: Rates, source: Source, currency: Currency) {
  switch (b.account) {
    case 'binance':
      return `${digits(b.usd, 2)} USDT`
    case 'efectivo_usd':
      return 'en dólares'
    default: {
      const r = currency === 'VES' ? rates.paralelo : source === 'binance' ? rates.usdtSell : rates.paralelo
      return `≈ ${bs(b.usd * (r || rates.bcv))}`
    }
  }
}

function buildSteps(plan: Plan, rates: Rates, source: Source, currency: Currency): string[] {
  const steps: string[] = []
  const total = (id: Bucket['id'], acc?: Bucket['account']) =>
    plan.buckets
      .filter((b) => b.id === id && (!acc || b.account === acc))
      .reduce((s, b) => s + b.usd, 0)

  const gastos = total('gastos')
  const toBinance = plan.buckets.filter((b) => b.account === 'binance').reduce((s, b) => s + b.usd, 0)
  const toCash = plan.buckets.filter((b) => b.account === 'efectivo_usd').reduce((s, b) => s + b.usd, 0)
  const toBs = plan.buckets
    .filter((b) => b.account === 'banesco' || b.account === 'efectivo_bs')
    .reduce((s, b) => s + b.usd, 0)

  if (gastos > 0.5) {
    if (currency === 'VES' || source === 'banesco') {
      steps.push(
        `Deja <b>${bs(gastos * (rates.paralelo || rates.bcv))}</b> quietos en Banesco: es el dinero de los gastos.`,
      )
    } else {
      steps.push(
        `Cambia <b>${usd(gastos)}</b> a bolívares y pásalos a Banesco. Tasa de referencia ${bs(rates.paralelo)} por dólar.`,
      )
    }
  }

  if (toBinance > 0.5) {
    if (source === 'binance') {
      steps.push(`Aparta <b>${digits(toBinance, 2)} USDT</b> en Binance, separados de los de gastos.`)
    } else if (source === 'efectivo_usd') {
      steps.push(
        `Compra <b>${digits(toBinance, 2)} USDT</b> en Binance P2P con esos dólares, o deposítalos y compra a Bs ${fmtRate(rates.usdtBuy)} como máximo.`,
      )
    } else {
      steps.push(
        `Compra <b>${digits(toBinance, 2)} USDT</b> en Binance P2P pagando con Bs, nunca por encima de Bs ${fmtRate(rates.usdtBuy)}.`,
      )
    }
  }

  if (toCash > 0.5) {
    steps.push(`Separa <b>${usd(toCash)}</b> en efectivo, fuera del dinero del día a día.`)
  }

  const goals = plan.buckets.filter((b) => b.id === 'meta')
  if (goals.length === 1) {
    steps.push(`Abona <b>${usd(goals[0].usd)}</b> a «${goals[0].label}»: al registrar, el avance de la meta sube solo.`)
  } else if (goals.length > 1) {
    const names = goals.map((g) => `${g.label} ${usd(g.usd)}`).join(', ')
    steps.push(`Reparte entre metas: <b>${names}</b>. El avance se actualiza al registrar.`)
  }

  const libre = total('libre')
  if (libre > 0.5 && toBs <= gastos + 0.5 && currency === 'USD') {
    steps.push(`Deja <b>${usd(libre)}</b> a mano para lo que salga; si no lo usas en dos semanas, súmalo a una meta.`)
  }

  return steps.slice(0, 4)
}

interface Props {
  plan: Plan
  rates: Rates
  source: Source
  currency: Currency
  onRegister: () => void
  onEdit: () => void
}

export function PlanView({ plan, rates, source, currency, onRegister, onEdit }: Props) {
  const v = plan.verdict
  const steps = buildSteps(plan, rates, source, currency)
  const total = plan.buckets.reduce((s, b) => s + b.usd, 0) || 1

  return (
    <div id="plan">
      <article className="verdict" data-action={v.action} aria-live="polite">
        <div className="kicker">
          <span>{plan.tierLabel}</span>
          <span>{v.confidence === 'alta' ? 'tasas al día' : v.confidence === 'media' ? 'tasas de hace rato' : 'tasas viejas'}</span>
        </div>
        <h2>{v.headline}</h2>
        <p>{v.detail}</p>
        <div className="verdict-foot">
          <span>BCV {fmtRate(rates.bcv)}</span>
          <span>USDT {fmtRate(rates.usdtBuy)}</span>
          <span>paralelo {fmtRate(rates.paralelo)}</span>
          <span>{v.usdtPremium ? `USDT ${pct(v.usdtPremium)} vs par.` : ''}</span>
        </div>
      </article>

      <section className="split" aria-label="Reparto">
        <div className="split-head">
          <h3>Reparto de {usd(plan.usdTotal)}</h3>
          <span>{plan.buckets.length} destinos</span>
        </div>
        <div className="split-bar" role="img" aria-label="Distribución proporcional del dinero">
          {plan.buckets.map((b) => (
            <i
              key={b.key}
              style={{ flexGrow: b.usd / total, background: COLOR[b.id] }}
              title={`${b.label}: ${usd(b.usd)}`}
            />
          ))}
        </div>
        <div className="legend">
          {plan.buckets.map((b) => {
            const acc = accountMeta(b.account)
            return (
              <div className="legend-row" key={b.key}>
                <div className="who">
                  <span className="swatch" style={{ background: COLOR[b.id] }} />
                  <div>
                    <div className="name">
                      {b.label}
                      <span className="badge" data-acc={b.account}>
                        {acc.name}
                      </span>
                    </div>
                    <div className="why">{b.why}</div>
                  </div>
                </div>
                <div className="amt">
                  <b>{usd(b.usd)}</b>
                  <small>{bucketSub(b, rates, source, currency)}</small>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="coverage" aria-label="Estado del mes">
        <div className="coverage-top">
          <span>Gastos fijos del mes</span>
          <b>
            {plan.daysCovered >= 30
              ? 'cubiertos'
              : plan.coveredBefore + (plan.buckets.find((b) => b.id === 'gastos')?.usd ?? 0) > 0
                ? `${Math.round(plan.daysCovered)} de 30 días`
                : 'sin registrar'}
          </b>
        </div>
        <div className="coverage-track">
          <i style={{ width: `${Math.min(100, (plan.daysCovered / 30) * 100)}%` }} />
        </div>
      </section>

      {steps.length > 0 && (
        <section className="steps" aria-label="Cómo lo ejecutas">
          <h3>Cómo lo ejecutas</h3>
          <ol>
            {steps.map((s, i) => (
              <li key={i}>
                <span dangerouslySetInnerHTML={{ __html: s }} />
              </li>
            ))}
          </ol>
        </section>
      )}

      {plan.notes.length > 0 && (
        <ul className="notes">
          {plan.notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}

      <button className="primary" data-tone="accent" style={{ marginTop: 22 }} onClick={onRegister}>
        <IconCheck />
        Registrar y guardar este reparto
      </button>
      <button
        className="ghost"
        style={{ marginTop: 10, width: '100%' }}
        onClick={onEdit}
      >
        Corregir el monto
      </button>
    </div>
  )
}
