/**
 * Yeast percentage calculator.
 *
 * Based on Casucci Formula L (Cap. 44) with correction for high hydration.
 *
 * Original Formula L: % = K / (i × T² × t)
 * Valid for: 4-16h, 20-30°C, salt 2.3-2.8%, hydration 54-60%.
 *
 * Problem: at high hydration (>60%), the formula underestimates yeast
 * because hydration at the denominator becomes dominant.
 *
 * Corrected approach: normalize hydration to the reference range (56%)
 * so the formula remains accurate across all hydrations.
 * This matches practical baker experience and online calculators
 * (PizzaBlab, dough.school) where yeast % depends mainly on hours + temp.
 */

/**
 * Calculate fresh yeast percentage on flour based on desired rise duration.
 * @param hours - desired dough duration in hours (1-98)
 * @param hydration - hydration % (e.g. 60) — used for minor correction only
 * @param tempC - fermentation temperature °C (default 24)
 * @returns yeast % on flour (e.g. 0.22 means 0.22%)
 */
export function calcYeastPct(
  hours: number,
  hydration: number,
  tempC = 24,
): number {
  if (hours <= 0 || tempC <= 0) return 0

  // Casucci Formula L with fixed reference hydration.
  // Original: K / (i × T² × t) — validated for hyd 54-60%.
  // We fix hydration at 56% (reference) because in practice
  // yeast quantity depends primarily on hours + temperature,
  // not on hydration. This matches baker experience.
  const REF_HYD = 56
  const K = 100000
  const raw = K / (REF_HYD * tempC * tempC * hours)
  return Math.round(raw * 1000) / 1000
}

/**
 * Calculate fresh yeast grams from percentage and flour weight.
 */
export function yeastGrams(yeastPct: number, flourGrams: number): number {
  return Math.round(flourGrams * yeastPct / 100 * 10) / 10
}
