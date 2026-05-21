/**
 * Format a number as Bangladeshi Taka (৳) using Indian grouping.
 * e.g. 1250000 → "৳ 12,50,000.00"
 */
export function formatBDT(value, decimals = 2) {
  if (value == null || isNaN(value)) return '—'

  const num = Number(value)
  const negative = num < 0
  const abs = Math.abs(num)

  const [intPart, decPart = ''] = abs.toFixed(decimals).split('.')

  // Indian grouping: last 3 digits, then groups of 2
  const last3 = intPart.slice(-3)
  const rest = intPart.slice(0, -3)
  const grouped = rest
    ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3
    : last3

  const formatted = decimals > 0 ? `${grouped}.${decPart}` : grouped
  return `${negative ? '-' : ''}\u09F3 ${formatted}`
}

/**
 * Format as BDT with 0 decimals (for Investment, Market Value, Gain/Loss).
 */
export function formatBDT0(value) {
  return formatBDT(value, 0)
}

/**
 * Format as BDT with 2 decimals (for NAV).
 */
export function formatBDT2(value) {
  return formatBDT(value, 2)
}
