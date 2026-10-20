const nfUSD = new Intl.NumberFormat('es-VE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const nfBs = new Intl.NumberFormat('es-VE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const nfRate = new Intl.NumberFormat('es-VE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export const usd = (n: number) => `$${nfUSD.format(round2(n))}`
export const bs = (n: number) => `Bs ${nfBs.format(round2(n))}`
export const rate = (n: number) => nfRate.format(round2(n))
export const pct = (n: number, digits = 1) =>
  `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(digits).replace('.', ',')}%`

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

export function money(n: number, currency: 'USD' | 'VES' | 'USDT') {
  if (currency === 'VES') return bs(n)
  return usd(n)
}

/** 1250.5 -> "1.250,50" (sin símbolo, para el input grande) */
export function digits(n: number, maxDecimals = 2) {
  return new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  }).format(n)
}

/** Sanea lo escrito: solo dígitos y una coma decimal (los puntos de miles se botan) */
export function sanitizeAmountInput(raw: string): string {
  let s = raw.replace(/[^\d,]/g, '')
  const i = s.indexOf(',')
  if (i > -1) {
    s = s.slice(0, i + 1) + s.slice(i + 1).replace(/,/g, '').slice(0, 2)
  }
  return s.slice(0, 16)
}

/** Agrupa con puntos de miles: "10000,5" -> "10.000,5" */
export function groupVeAmount(sanitized: string): string {
  const [intPart, decPart] = sanitized.split(',')
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return decPart !== undefined ? `${grouped},${decPart}` : grouped
}

/** Convierte "1.250,50" o "1250.50" a número */
export function parseAmount(raw: string): number {
  const clean = raw.replace(/[^\d.,]/g, '')
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

export function relativeTime(ts: number) {
  const mins = Math.floor((Date.now() - ts) / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  return `hace ${days} d`
}

export function daysUntil(dateISO: string) {
  const target = new Date(`${dateISO}T23:59:59`).getTime()
  return Math.ceil((target - Date.now()) / 86400000)
}

export function todayISO() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}

export function monthLabel(ts: number) {
  return new Intl.DateTimeFormat('es-VE', { month: 'long', year: 'numeric' }).format(ts)
}
