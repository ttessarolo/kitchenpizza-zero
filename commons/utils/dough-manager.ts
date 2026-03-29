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
import { DOUGH_COMPOSITION_DEFAULTS, type DoughCompositionDefaults } from '../../local_data/dough-defaults'

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
 * Uses the ScienceProvider to read the formula from /science/ JSON.
 * Default variant is Casucci Formula L (Cap. 44):
 *   % = K / (REF_HYD * tempC² * hours)
 *
 * If a variantKey is specified, uses that formula variant.
 *
 * Valid for: 1-98h, tempC > 0.
 *
 * @returns yeast % on flour (e.g. 0.22 means 0.22%)
 */
export function calcYeastPct(
  provider: ScienceProvider,
  hours: number,
  tempC = 24,
  variantKey?: string,
  flourW?: number,
): number {
  if (hours <= 0 || tempC <= 0) return 0
  const base = evaluateFormula(provider.getFormula('yeast_pct'), { hours, tempC }, variantKey)
  if (flourW && flourW > 0) {
    const correction = evaluateFormula(provider.getFormula('yeast_w_correction'), { W: flourW })
    return Math.round(base * correction * 1000) / 1000
  }
  return base
}

/**
 * Client-safe yeast calculation — hardcoded Formula L (no ScienceProvider needed).
 * Use this for interactive UI sliders where instant feedback is needed.
 * For server-side calculations, prefer calcYeastPct(provider, ...).
 *
 * [C] Cap. 44 — Formula L: K / (hydration * tempC² * hours)
 * Default hydration 56%, default tempC 24°C.
 */
export function calcYeastPctClient(
  hours: number,
  hydration = 56,
  tempC = 24,
  flourW?: number,
): number {
  if (hours <= 0 || tempC <= 0) return 0
  const K = 100000
  const raw = K / (hydration * tempC * tempC * hours)
  let result = Math.round(raw * 1000) / 1000
  if (flourW && flourW > 0) {
    const correction = Math.max(0.6, Math.min(2.0, 280 / flourW))
    result = Math.round(result * correction * 1000) / 1000
  }
  return result
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
  flours: FlourIngredient[],
  liquids: LiquidIngredient[],
  ambientTemp: number,
  frictionFactor: number,
): number {
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

  // 15% air incorporation at ambient temperature
  const aw = t * 0.15
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
export function computeSuggestedSalt(totalFlour: number, hydration: number): number {
  const basePct = 2.5
  const adjustment = Math.max(0, (hydration - 60) * 0.01)
  const pct = Math.min(3.0, Math.max(2.0, basePct + adjustment))
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
export function getDoughDefaults(type: string, subtype: string | null): DoughCompositionDefaults {
  const exact = DOUGH_COMPOSITION_DEFAULTS.find((d) => d.type === type && d.subtype === subtype)
  if (exact) return exact
  return DOUGH_COMPOSITION_DEFAULTS.find((d) => d.type === type && d.subtype === null)
    ?? DOUGH_COMPOSITION_DEFAULTS[DOUGH_COMPOSITION_DEFAULTS.length - 1]
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
  const defaults = getDoughDefaults(profile.recipeType, profile.recipeSubtype)
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
