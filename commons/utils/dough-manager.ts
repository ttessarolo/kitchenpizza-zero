/**
 * DoughManager — Centralized dough composition logic.
 *
 * Consolidates all dough-related calculations:
 * - Flour blending (weighted properties: W, protein, P/L, absorption)
 * - Yeast calculation (Casucci Formula L) — via ScienceProvider
 * - Dough temperature (weighted average + friction)
 * - Composition metrics (salt%, sugar%, fat%)
 * - Composition warnings (scientific guardrails) — via ScienceProvider
 * - Dough defaults per recipe type
 *
 * Scientific references:
 * - Casucci "La Pizza è un Arte" (2020) — Cap. 17-23 (reologia), Cap. 33-44 (lieviti), Cap. 50-54 (idratazione, sale, lipidi)
 * - All formulas are pure functions with configuration from /science/ JSON
 */

import type {
  FlourIngredient,
  LiquidIngredient,
  SaltIngredient,
  SugarIngredient,
  FatIngredient,
} from '@commons/types/recipe'
import type { DoughCompositionDefaults } from '../../local_data/dough-defaults'

// ── Re-exports from FlourManager (flour is lower-level) ────────
// DoughManager depends on FlourManager for flour operations.
// Re-exported so existing consumers of DoughManager still work.
export { getFlour, blendFlourProperties, estimateBlendW, estimateW } from './flour-manager'

// ── Helpers ────────────────────────────────────────────────────

// rnd is canonical in format.ts — re-exported for backward compat
export { rnd } from './format'
import { rnd } from './format'

// ── Science imports ────────────────────────────────────────────

import type { ScienceProvider } from './science/science-provider'
import { evaluateFormula } from './science/formula-engine'
import { evaluateRules, type RuleResult } from './science/rule-engine'

// ── Yeast calculation ──────────────────────────────────────────

/**
 * Calculate fresh yeast percentage on flour based on desired rise duration.
 *
 * Uses the ScienceProvider (works both server and client via staticProvider).
 * Default variant is Casucci Formula L (Cap. 44):
 *   L = K / (hydration × tempC² × hours)
 *
 * @returns yeast % on flour (e.g. 0.22 means 0.22%)
 */
export function calcYeastPct(
  provider: ScienceProvider,
  hours: number,
  hydration = 56,
  tempC = 24,
  variantKey?: string,
  flourW?: number,
): number {
  if (hours <= 0 || tempC <= 0) return 0
  const base = evaluateFormula(provider.getFormula('yeast_pct'), { hours, tempC, hydration }, variantKey)
  if (flourW && flourW > 0) {
    const correction = evaluateFormula(provider.getFormula('yeast_w_correction'), { W: flourW })
    return Math.round(base * correction * 1000) / 1000
  }
  return base
}

/**
 * Inverse Formula L — calculate rise duration (hours) from yeast percentage.
 *
 * Uses the ScienceProvider (works both server and client via staticProvider).
 * [C] Cap. 44: D = K / (hydration × tempC² × yeastPct)
 *
 * Note: yeastPct input is the effective value (already W-corrected from forward formula).
 * No W correction needed on the inverse — it would be mathematically redundant.
 *
 * @returns duration in hours (clamped 1-98, rounded to integer)
 */
export function calcDurationFromYeast(
  provider: ScienceProvider,
  yeastPct: number,
  hydration = 56,
  tempC = 24,
): number {
  if (yeastPct <= 0 || tempC <= 0 || hydration <= 0) return 18
  return evaluateFormula(provider.getFormula('yeast_duration_inverse'), { yeastPct, hydration, tempC })
}

/** Convert yeast percentage to grams given flour weight. */
export function yeastGrams(yeastPct: number, flourGrams: number): number {
  return Math.round(flourGrams * yeastPct / 100 * 10) / 10
}

// ── Dough temperature ──────────────────────────────────────────

/**
 * Calculate final dough temperature (FDT).
 *
 * Weighted average of all ingredient temperatures, with 15% air incorporation
 * at ambient temperature, plus a friction factor from kneading.
 *
 * [C] Cap. 55 — The "rule of 55" for direct doughs:
 *   water_temp = 55 - flour_temp - ambient_temp
 * This function generalizes it as a weighted average.
 *
 * @param frictionFactor - temperature increase from kneading (typically 1-3°C)
 * @returns final dough temperature in °C
 */
export function calcFinalDoughTemp(
  provider: ScienceProvider | undefined,
  flours: FlourIngredient[],
  liquids: LiquidIngredient[],
  ambientTemp: number,
  frictionFactor: number,
): number {
  const block = provider?.getBlock('dough_salt_constants') as any
  const airPct = block?.airIncorporationPct ?? 0.15

  let t = 0
  let s = 0

  for (const f of flours) {
    t += f.g
    s += f.g * (f.temp ?? ambientTemp)
  }
  for (const l of liquids) {
    t += l.g
    s += l.g * (l.temp ?? ambientTemp)
  }

  // Air incorporation at ambient temperature
  const aw = t * airPct
  t += aw
  s += aw * ambientTemp

  return t > 0 ? Math.round((s / t + frictionFactor) * 10) / 10 : ambientTemp
}

// ── Composition metrics ────────────────────────────────────────

/**
 * Compute suggested salt in grams based on flour weight and hydration.
 * Base 2.5% with minor adjustment for high hydration, clamped to 2.0–3.0%.
 * [C] Cap. 53 — Salt in pizza doughs: 2.3-2.8% typical.
 */
export function computeSuggestedSalt(provider: ScienceProvider, totalFlour: number, hydration: number): number {
  try {
    const formula = provider.getFormula('suggested_salt')
    if (formula?.expr) {
      return evaluateFormula(formula, { totalFlour, hydration })
    }
  } catch { /* fall through to constants-based calculation */ }
  // Fallback from constants block
  const block = provider.getBlock('dough_salt_constants') as any
  const s = block?.suggestedSalt
  const adjFactor = s?.adjustFactor ?? 0.01
  const threshold = s?.hydrationThreshold ?? 60
  const adjustment = Math.max(0, (hydration - threshold) * adjFactor)
  const pct = Math.min(s?.maxPct ?? 3.0, Math.max(s?.minPct ?? 2.0, (s?.basePct ?? 2.5) + adjustment))
  return rnd(totalFlour * pct / 100)
}

/** Get salt percentage relative to flour. [C] Cap. 53 */
export function getSaltPct(salts: SaltIngredient[], totalFlour: number): number {
  if (totalFlour <= 0) return 0
  const totalSalt = salts.reduce((a, s) => a + s.g, 0)
  return rnd((totalSalt / totalFlour) * 1000) / 10
}

/** Get sugar percentage relative to flour. [C] Cap. 54 */
export function getSugarPct(sugars: SugarIngredient[], totalFlour: number): number {
  if (totalFlour <= 0) return 0
  const totalSugar = sugars.reduce((a, s) => a + s.g, 0)
  return rnd((totalSugar / totalFlour) * 1000) / 10
}

/** Get fat percentage relative to flour. [C] Cap. 54 */
export function getFatPct(fats: FatIngredient[], totalFlour: number): number {
  if (totalFlour <= 0) return 0
  const totalFat = fats.reduce((a, f) => a + f.g, 0)
  return rnd((totalFat / totalFlour) * 1000) / 10
}

// ── Dough defaults ─────────────────────────────────────────────

/**
 * Get dough composition defaults for a given recipe type/subtype.
 * Fallback chain: exact match → type-level → 'altro' catch-all.
 * [C] Cap. 44, 53, 54 — Per-style composition ranges.
 */
export function getDoughDefaults(provider: ScienceProvider, type: string, subtype: string | null): DoughCompositionDefaults {
  return provider.getDefaults('dough_composition', type, subtype) as DoughCompositionDefaults
}

// ── Warnings ───────────────────────────────────────────────────

export interface DoughProfileInput {
  doughHours: number
  yeastPct: number
  saltPct: number
  fatPct: number
  hydration: number
  flourW: number                    // blended W of the flour mix
  recipeType: string
  recipeSubtype: string | null
  _hasGlutenFreeFlour?: boolean     // any gluten-free flour in mix
  _wholeGrainPct?: number           // % of whole-grain flour by weight
}

/**
 * Get all warnings for the current dough composition profile.
 * Uses the ScienceProvider to read rules from /science/ JSON.
 * Returns RuleResult[] with messageKey (not resolved text).
 *
 * [C] Cap. 44 — Yeast ranges by duration
 * [C] Cap. 53 — Salt ranges by product type
 * [C] Cap. 54 — Fat ranges and inhibition thresholds
 * [C] Cap. 51 — Hydration extremes and flour requirements
 */
export function getDoughWarnings(
  provider: ScienceProvider,
  profile: DoughProfileInput,
): RuleResult[] {
  const defaults = getDoughDefaults(provider, profile.recipeType, profile.recipeSubtype)
  const ctx: Record<string, unknown> = {
    ...profile,
    _saltMin: defaults.saltPctRange[0],
    _saltMax: defaults.saltPctRange[1],
    _fatMin: defaults.fatPctRange[0],
    _fatMax: defaults.fatPctRange[1],
  }
  return evaluateRules(provider.getRules('composition'), ctx)
}

// maxRiseHoursForW → canonical source is rise-manager.ts, re-exported for backward compat
export { maxRiseHoursForW } from './rise-manager'

// Re-export RuleResult for consumers that need the warning type
export type { RuleResult } from './science/rule-engine'
