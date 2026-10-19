import type {
  Bucket,
  Currency,
  Goal,
  Plan,
  Rates,
  Settings,
  Tier,
  Verdict,
  VerdictAction,
} from '../types'
import { daysUntil } from '../lib/format'

interface PlanInput {
  amount: number
  currency: Currency
  rates: Rates
  settings: Settings
  goals: Goal[]
  coveredBefore: number
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

const TIER_LABEL: Record<Tier, string> = {
  supervivencia: 'Ingreso menor a un tercio del mes',
  ajustado: 'Ingreso parcial del mes',
  normal: 'Ingreso típico del mes',
  holgado: 'Ingreso grande frente a tus gastos',
}

/** Cuánto del excedente va a cada bolsillo, según el tamaño del ingreso y tu perfil */
function surplusShares(tier: Tier, risk: Settings['risk']) {
  let shares: Record<'colchon' | 'metas' | 'libre', number> =
    tier === 'ajustado'
      ? { colchon: 0.5, metas: 0.4, libre: 0.1 }
      : tier === 'normal'
        ? { colchon: 0.35, metas: 0.5, libre: 0.15 }
        : { colchon: 0.2, metas: 0.6, libre: 0.2 }

  if (risk === 'liquidez') {
    // Prioriza tener plata disponible antes que metas lejanas
    shares = {
      colchon: shares.colchon + 0.05,
      metas: Math.max(0, shares.metas - 0.15),
      libre: shares.libre + 0.1,
    }
  }
  if (risk === 'dolarizar') {
    // Prioriza sacar el dinero de bolívares
    shares = {
      colchon: shares.colchon + 0.1,
      metas: Math.min(1, shares.metas + 0.05),
      libre: Math.max(0, shares.libre - 0.15),
    }
  }
  const total = shares.colchon + shares.metas + shares.libre
  return {
    colchon: shares.colchon / total,
    metas: shares.metas / total,
    libre: shares.libre / total,
  }
}

function goalUrgency(goal: Goal) {
  const days = Math.max(1, daysUntil(goal.deadline))
  const weight = goal.priority === 1 ? 1.35 : goal.priority === 2 ? 1 : 0.65
  return { days, score: weight / Math.sqrt(days) }
}

export function buildPlan({ amount, currency, rates, settings, goals, coveredBefore }: PlanInput): Plan {
  const amountValue = Number.isFinite(amount) && amount > 0 ? amount : 0
  const realRate = currency === 'VES' ? rates.paralelo || rates.bcv || 1 : 1
  const usdTotal = currency === 'VES' ? amountValue / realRate : amountValue
  const needs = Math.max(0, settings.fixedExpensesUSD)
  const uncovered = Math.max(0, needs - coveredBefore)
  const ratio = needs > 0 ? usdTotal / needs : usdTotal > 0 ? 4 : 0

  const tier: Tier =
    ratio < 0.33 ? 'supervivencia' : ratio < 0.85 ? 'ajustado' : ratio < 2 ? 'normal' : 'holgado'

  const activeGoals = goals
    .filter((g) => g.active && g.targetUSD - g.savedUSD > 0.5)
    .map((g) => ({ goal: g, ...goalUrgency(g) }))
    .sort((a, b) => b.score - a.score)

  const reserveTarget = settings.reserveMonths * needs
  const reserveGap = Math.max(0, reserveTarget - settings.reserveSavedUSD)

  // Cascada: primero el mes, después el excedente por porcentajes del tamaño del ingreso
  const gastos = tier === 'supervivencia' ? usdTotal : Math.min(uncovered, usdTotal)
  let surplus = Math.max(0, usdTotal - gastos)
  const shares = surplusShares(tier, settings.risk)

  let colchonShare = surplus * shares.colchon
  const metasShare = surplus * shares.metas
  let libreShare = surplus * shares.libre

  // El colchón no crece más allá de su meta: lo que sobra vuelve a la caja libre
  if (colchonShare > reserveGap) {
    libreShare += colchonShare - reserveGap
    colchonShare = reserveGap
  }
  // Sin metas activas, ese dinero no se queda huérfano: va a la caja libre con aviso
  const notes: string[] = []
  if (!activeGoals.length && metasShare > 0) {
    libreShare += metasShare
    notes.push(
      'No tienes metas activas: el dinero de proyectos se fue a caja libre. Crea una meta para que cada ingreso tenga destino.',
    )
  }

  // Reparto de las metas: primero la más urgente, con techo del 70% del sobre
  const goalAllocations: Array<{ goal: Goal; usd: number; days: number }> = []
  let metasLeft = activeGoals.length ? metasShare : 0
  for (const item of activeGoals) {
    if (metasLeft <= 0.5) break
    const remaining = item.goal.targetUSD - item.goal.savedUSD
    const cap = metasShare * 0.7
    const take = Math.min(remaining, cap, metasLeft)
    if (take > 0.5) {
      goalAllocations.push({ goal: item.goal, usd: take, days: item.days })
      metasLeft -= take
    }
  }
  for (const item of activeGoals) {
    if (metasLeft <= 0.5) break
    if (goalAllocations.some((a) => a.goal.id === item.goal.id)) continue
    const remaining = item.goal.targetUSD - item.goal.savedUSD
    const take = Math.min(remaining, metasLeft)
    if (take > 0.5) {
      goalAllocations.push({ goal: item.goal, usd: take, days: item.days })
      metasLeft -= take
    }
  }
  if (metasLeft > 0.5) libreShare += metasLeft

  const buckets: Bucket[] = []
  const push = (b: Bucket) => {
    if (b.usd > 0.5) buckets.push(b)
  }

  push({
    key: 'gastos',
    id: 'gastos',
    label: uncovered > 0 ? 'Gastos del mes' : 'Gastos de la semana',
    usd: gastos,
    account: settings.expensesInBs ? 'banesco' : 'efectivo_usd',
    why:
      uncovered > 0
        ? `Te faltan ${Math.round(uncovered)} dólares para cerrar los gastos fijos de este mes. Esto los cubre primero.`
        : 'Tus gastos del mes ya están cubiertos, así que esto queda como caja para la semana.',
    horizonDays: settings.expensesInBs ? 30 : 15,
  })

  // Colchón: se divide la custodia cuando crece, para no depender de una sola cuenta
  if (colchonShare > 0.5) {
    const split = settings.custodySplitUSD > 0 && colchonShare > settings.custodySplitUSD
    if (split) {
      const toBinance = colchonShare * 0.6
      const toCash = colchonShare - toBinance
      push({
        key: 'colchon-binance',
        id: 'colchon',
        label: 'Colchón de emergencia',
        usd: toBinance,
        account: 'binance',
        why: `Colchón guardado en USDT: mantiene el valor y lo puedes cambiar en minutos. Va repartido para no tener todo en una sola cuenta.`,
        horizonDays: 180,
      })
      push({
        key: 'colchon-efectivo',
        id: 'colchon',
        label: 'Colchón de emergencia',
        usd: toCash,
        account: 'efectivo_usd',
        why: 'La otra parte del colchón en efectivo: cero riesgo de plataforma y sirve para una urgencia un domingo.',
        horizonDays: 365,
      })
    } else {
      const account = settings.risk === 'liquidez' ? 'efectivo_usd' : 'binance'
      push({
        key: 'colchon',
        id: 'colchon',
        label: 'Colchón de emergencia',
        usd: colchonShare,
        account,
        why:
          account === 'binance'
            ? 'No guardes el colchón en bolívares: con la devaluación pierde valor cada mes.'
            : 'Tu perfil pide tener el colchón a mano, sin depender de una plataforma.',
        horizonDays: 180,
      })
    }
  }

  for (const alloc of goalAllocations) {
    const short = alloc.days <= 45
    const account = short ? 'efectivo_usd' : alloc.goal.account
    push({
      key: `meta-${alloc.goal.id}`,
      id: 'meta',
      label: alloc.goal.name,
      usd: alloc.usd,
      account,
      goalId: alloc.goal.id,
      why:
        alloc.days <= 45
          ? `La meta vence en ${alloc.days} días: mejor en efectivo o a mano para no pagar comisiones ni esperar un P2P.`
          : `Meta con ${alloc.days} días de margen: lo más eficiente es USDT para que no se derrita mientras esperas.`,
      horizonDays: alloc.days,
    })
  }

  push({
    key: 'libre',
    id: 'libre',
    label: 'Caja libre',
    usd: libreShare,
    account: settings.expensesInBs ? 'banesco' : 'efectivo_usd',
    why: 'Plata sin destino fijo: úsala para algo puntual o súmala a una meta cuando decidas.',
    horizonDays: 15,
  })

  // ---- Decisión de tasa: ¿compro USDT ya, o dejo los bolívares quietos? ----
  const usdtPremium =
    rates.paralelo > 0 && rates.usdtBuy > 0
      ? ((rates.usdtBuy - rates.paralelo) / rates.paralelo) * 100
      : 0
  const drift = Math.max(0, rates.bcvDrift30d)
  const toUsdt = buckets
    .filter((b) => b.account === 'binance')
    .reduce((s, b) => s + b.usd, 0)
  const usdCash = buckets
    .filter((b) => b.account === 'efectivo_usd')
    .reduce((s, b) => s + b.usd, 0)
  const bsToHold = buckets
    .filter((b) => b.account === 'banesco' || b.account === 'efectivo_bs')
    .reduce((s, b) => s + b.usd, 0)

  const confidence: Verdict['confidence'] =
    rates.stale || !rates.fetchedAt
      ? 'baja'
      : Date.now() - rates.fetchedAt < 30 * 60 * 1000
        ? 'alta'
        : 'media'

  let verdict: Verdict
  const usdtLine = `USDT a Bs ${fmt(rates.usdtBuy)} en Binance P2P`
  const parLine = rates.paralelo ? `paralelo Bs ${fmt(rates.paralelo)}` : 'sin paralelo'

  if (usdTotal === 0) {
    verdict = {
      action: 'solo_gastos',
      headline: 'Escribe cuánto te cayó',
      detail: 'Pon el monto y en qué moneda entró: la app consulta BCV, paralelo y USDT antes de repartir.',
      usdtAmount: 0,
      usdCashAmount: 0,
      bsToHold: 0,
      confidence: 'baja',
      costOfHoldingBs: drift,
      usdtPremium,
    }
  } else if (tier === 'supervivencia' && toUsdt < 1) {
    verdict = {
      action: 'solo_gastos',
      headline: 'No conviertas nada: este dinero ya tiene dueño',
      detail: `Con ${Math.round(usdTotal)} dólares no llegas ni a un tercio de tus gastos del mes. Pásalo a bolívares solo cuando vayas a pagar y no compres USDT hoy: el ida y vuelta te come ${Math.abs(usdtPremium).toFixed(1)}% con un solo cambio de precio.`,
      usdtAmount: 0,
      usdCashAmount: usdCash,
      bsToHold,
      confidence,
      costOfHoldingBs: drift,
      usdtPremium,
    }
  } else if (toUsdt >= 1) {
    const cheap = usdtPremium <= 0.8
    const action: VerdictAction = cheap ? 'comprar_usdt' : 'mixto'
    const lostPerMonth = drift > 0 ? `Los bolívares parados pierden cerca de ${drift.toFixed(1)}% al mes según el BCV.` : ''
    verdict = {
      action,
      headline: cheap
        ? `Compra ${Math.round(toUsdt)} USDT hoy`
        : `Convierte solo ${Math.round(toUsdt)} USDT y espera mejor precio`,
      detail: cheap
        ? `${usdtLine}, ${usdtPremium <= 0 ? 'por debajo' : 'apenas ' + usdtPremium.toFixed(1) + '% por encima'} del ${parLine}. ${lostPerMonth} Deja en bolívares solo los ${Math.round(bsToHold)} dólares que vas a gastar.`
        : `${usdtLine} está ${usdtPremium.toFixed(1)}% por encima del ${parLine}: comprar todo hoy te cuesta caro. Convierte lo esencial y vende el resto en P2P cuando la brecha baje de 1%.`,
      usdtAmount: toUsdt,
      usdCashAmount: usdCash,
      bsToHold,
      confidence,
      costOfHoldingBs: drift,
      usdtPremium,
    }
  } else if (usdCash >= 1) {
    verdict = {
      action: 'mixto',
      headline: `Guarda ${Math.round(usdCash)} dólares en efectivo`,
      detail: `Este reparto no necesita Binance: es plata de corto plazo. ${usdtLine} contra ${parLine}: convertir ahora no te da ventaja y te expone a la comisión del P2P.`,
      usdtAmount: 0,
      usdCashAmount: usdCash,
      bsToHold,
      confidence,
      costOfHoldingBs: drift,
      usdtPremium,
    }
  } else {
    verdict = {
      action: 'quedarse_bs',
      headline: 'Déjalo en bolívares, pero gástalo pronto',
      detail: `Todo este dinero es para gastos inmediatos en Bs. ${drift > 0 ? `Ojo: el BCV viene subiendo ~${drift.toFixed(1)}% al mes, así que no lo dejes quieto más de dos semanas.` : 'No lo dejes quieto más de dos semanas.'}`,
      usdtAmount: 0,
      usdCashAmount: 0,
      bsToHold,
      confidence,
      costOfHoldingBs: drift,
      usdtPremium,
    }
  }

  if (rates.stale) {
    notes.push('Las tasas son las últimas guardadas, no las de ahora. Actualiza antes de mover dinero real.')
  }

  const coveredAfter = coveredBefore + gastos
  const daysCovered = needs > 0 ? clamp((coveredAfter / needs) * 30, 0, 30) : 0

  return {
    usdTotal,
    bsTotal: currency === 'VES' ? amountValue : usdTotal * (rates.paralelo || rates.bcv || 0),
    bsAtBcv: usdTotal * (rates.bcv || 0),
    buckets,
    verdict,
    tier,
    tierLabel: TIER_LABEL[tier],
    uncoveredNeeds: uncovered,
    coveredBefore,
    daysCovered,
    notes,
  }
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
