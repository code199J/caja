import type { Rates } from '../types'
import { EMPTY_RATES } from '../types'
import { loadRates, saveRates } from '../lib/store'

const TTL = 10 * 60 * 1000

const median = (values: number[]) => {
  const v = values.filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b)
  if (!v.length) return 0
  const mid = Math.floor(v.length / 2)
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2
}

/** GET simple: sin cabeceras custom para no disparar el preflight de CORS */
async function getJSON(url: string) {
  const signal =
    typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal
      ? AbortSignal.timeout(12000)
      : undefined
  const res = await fetch(url, signal ? { signal } : {})
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

interface CriptoYaVenue {
  ask: number
  bid: number
}

/**
 * Precio del USDT en Venezuela agregado por criptoya.com (Binance P2P, Bybit,
 * OKX, MEXC, Bitget, BingX, Saldo). ask = lo que pagas por comprar 1 USDT con
 * Bs; bid = lo que recibes al venderlo.
 */
function usdtPrices(data: Record<string, CriptoYaVenue>) {
  const venues = Object.values(data).filter((v) => v && Number.isFinite(v.ask) && v.ask > 0)
  const asks = venues.map((v) => v.ask)
  const bids = venues.filter((v) => v.bid > 0).map((v) => v.bid)
  const medianAsk = median(asks)
  const medianBid = median(bids)
  // Prefiere Binance (la cuenta del usuario), salvo que se vea muy fuera del mercado
  const buy =
    data.binancep2p && Math.abs(data.binancep2p.ask / medianAsk - 1) < 0.05
      ? data.binancep2p.ask
      : medianAsk
  const sell =
    data.binancep2p && data.binancep2p.bid > 0 && Math.abs(data.binancep2p.bid / medianBid - 1) < 0.05
      ? data.binancep2p.bid
      : medianBid
  return { buy, sell, best: asks.length ? Math.min(...asks) : 0 }
}

/** Deriva mensual del BCV según los últimos ~30 días del histórico oficial */
function bcvDrift(history: Array<{ fecha: string; promedio: number | null }>): number {
  const points = history
    .filter((p) => p.promedio && p.promedio > 0)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
  if (points.length < 5) return 0
  const last = points[points.length - 1]
  const target = new Date(last.fecha)
  target.setDate(target.getDate() - 30)
  const iso = target.toISOString().slice(0, 10)
  const base = points.find((p) => p.fecha >= iso) ?? points[0]
  if (!base.promedio) return 0
  const days = Math.max(
    1,
    (new Date(last.fecha).getTime() - new Date(base.fecha).getTime()) / 86400000,
  )
  const growth = (last.promedio! / base.promedio - 1) * (30 / days)
  return growth * 100
}

export async function fetchRates(force = false): Promise<Rates> {
  const cached = loadRates()
  if (!force && cached && Date.now() - cached.fetchedAt < TTL) return cached

  const [bcv, paralelo, criptoya, hist] = await Promise.allSettled([
    getJSON('https://ve.dolarapi.com/v1/dolares/oficial'),
    getJSON('https://ve.dolarapi.com/v1/dolares/paralelo'),
    getJSON('https://criptoya.com/api/USDT/VES/1'),
    getJSON('https://ve.dolarapi.com/v1/historicos/dolares/oficial'),
  ])

  const usdt =
    criptoya.status === 'fulfilled' ? usdtPrices(criptoya.value) : { buy: 0, sell: 0, best: 0 }

  const next: Rates = {
    bcv: bcv.status === 'fulfilled' ? Number(bcv.value?.promedio) || 0 : cached?.bcv ?? 0,
    paralelo:
      paralelo.status === 'fulfilled'
        ? Number(paralelo.value?.promedio) || 0
        : cached?.paralelo ?? 0,
    usdtBuy: usdt.buy || cached?.usdtBuy || 0,
    usdtBest: usdt.best || cached?.usdtBest || 0,
    usdtSell: usdt.sell || cached?.usdtSell || 0,
    bcvDrift30d:
      hist.status === 'fulfilled' ? bcvDrift(hist.value) : cached?.bcvDrift30d ?? 0,
    fetchedAt: Date.now(),
    source: 'vivo',
  }

  const missing = !next.bcv || !next.paralelo || !next.usdtBuy
  if (missing) {
    if (cached && (cached.bcv > 0 || cached.paralelo > 0)) {
      return {
        ...cached,
        source: 'guardado',
        stale: true,
        error: 'No hubo respuesta de las tasas. Uso las últimas guardadas: verifica antes de mover dinero.',
      }
    }
    return {
      ...EMPTY_RATES,
      fetchedAt: 0,
      stale: true,
      error: 'No pude consultar BCV, paralelo ni USDT. Revisa la conexión y vuelve a intentar.',
    }
  }
  saveRates(next)
  return next
}
