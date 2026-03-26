/**
 * Format utilities — pure display helpers, safe for client-side use.
 * These contain ZERO business logic. They format numbers, times, and labels.
 */

/** Intelligent rounding: >=100 → int, >=10 → 0.5, else → 0.1 */
export function rnd(v: number): number {
  return v >= 100
    ? Math.round(v)
    : v >= 10
      ? Math.round(v * 2) / 2
      : Math.round(v * 10) / 10
}

/** Left-pad a number to 2 digits */
export function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Format a Date to "HH:MM" */
export function fmtTime(d: Date): string {
  return pad(d.getHours()) + ':' + pad(d.getMinutes())
}

/** Format minutes: "<60min" or "Xh" or "Xh Ymin" */
export function fmtDuration(m: number): string {
  if (m < 60) return m + ' min'
  const h = Math.floor(m / 60)
  const r = m % 60
  return r ? h + 'h ' + r + 'min' : h + 'h'
}

/** Convert Celsius to Fahrenheit, rounded */
export function celsiusToFahrenheit(c: number): number {
  return Math.round((c * 9) / 5 + 32)
}

/** Convert Fahrenheit to Celsius, rounded */
export function fahrenheitToCelsius(f: number): number {
  return Math.round(((f - 32) * 5) / 9)
}

/** Next sequential id from an array of items with numeric ids, or 0 if empty */
export function nextId(items: { id: number }[]): number {
  return items.length ? Math.max(...items.map((x) => x.id)) + 1 : 0
}

/** Relative date label in Italian */
export function relativeDate(d: Date): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const df = Math.round(
    (new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - today.getTime()) / 864e5,
  )
  return df === 0
    ? 'oggi'
    : df === 1
      ? 'domani'
      : df === 2
        ? 'dopodomani'
        : df < 0
          ? Math.abs(df) + 'gg fa'
          : 'tra ' + df + 'gg'
}

/** Map thickness value to Italian label */
export function thicknessLabel(t: number): string {
  return t <= 0.2
    ? 'Sottilissimo'
    : t <= 0.4
      ? 'Sottile'
      : t <= 0.6
        ? 'Medio'
        : t <= 0.9
          ? 'Alto'
          : t <= 1.4
            ? 'Molto alto'
            : 'Molto spesso'
}
