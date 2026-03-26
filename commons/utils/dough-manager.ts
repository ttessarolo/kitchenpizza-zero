/**
 * DoughManager — Centralized dough composition logic.
 *
 * Consolidates all dough-related calculations:
 * - Flour blending (weighted properties: W, protein, P/L, absorption)
 * - Yeast calculation (Casucci Formula L)
 * - Dough temperature (weighted average + friction)
 * - Composition metrics (salt%, sugar%, fat%)
 * - Composition warnings (scientific guardrails)
 * - Dough defaults per recipe type
 *
 * Scientific references:
 * - Casucci "La Pizza è un Arte" (2020) — Cap. 17-23 (reologia), Cap. 33-44 (lieviti), Cap. 50-54 (idratazione, sale, lipidi)
 * - All formulas are pure functions with configuration from local_data/
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
export { getFlour, blendFlourProperties, estimateW } from './flour-manager'

// ── Helpers ────────────────────────────────────────────────────

// rnd is canonical in format.ts — re-exported for backward compat
export { rnd } from './format'
import { rnd } from './format'

// ── Yeast calculation ──────────────────────────────────────────

/**
 * Calculate fresh yeast percentage on flour based on desired rise duration.
 *
 * Based on Casucci Formula L (Cap. 44):
 *   % = K / (i × T² × t)
 * where K=100000, i=reference hydration (56%), T=temperature °C, t=hours.
 *
 * The hydration is fixed at reference 56% because in practice yeast quantity
 * depends primarily on hours + temperature, not on hydration.
 * This matches practical baker experience and online calculators.
 *
 * Valid for: 1-98h, tempC > 0.
 *
 * @returns yeast % on flour (e.g. 0.22 means 0.22%)
 */
export function calcYeastPct(
  hours: number,
  hydration: number,
  tempC = 24,
): number {
  if (hours <= 0 || tempC <= 0) return 0
  const REF_HYD = 56
  const K = 100000
  const raw = K / (REF_HYD * tempC * tempC * hours)
  return Math.round(raw * 1000) / 1000
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

export interface DoughWarning {
  id: string
  category: 'yeast' | 'salt' | 'fat' | 'hydration' | 'temp' | 'baking' | 'flour' | 'general'
  severity: 'info' | 'warning' | 'error'
  message: string
}

export interface DoughProfileInput {
  doughHours: number
  yeastPct: number
  saltPct: number
  fatPct: number
  hydration: number
  recipeType: string
  recipeSubtype: string | null
}

/**
 * Get all warnings for the current dough composition profile.
 * Evaluates against scientific guardrails from baking literature.
 *
 * [C] Cap. 44 — Yeast ranges by duration
 * [C] Cap. 53 — Salt ranges by product type
 * [C] Cap. 54 — Fat ranges and inhibition thresholds
 * [C] Cap. 51 — Hydration extremes and flour requirements
 */
export function getDoughWarnings(profile: DoughProfileInput): DoughWarning[] {
  const warnings: DoughWarning[] = []
  const defaults = getDoughDefaults(profile.recipeType, profile.recipeSubtype)

  // ── Yeast warnings ──
  if (profile.yeastPct > 0) {
    if (profile.yeastPct < 0.03) {
      warnings.push({
        id: 'yeast_too_low',
        category: 'yeast',
        severity: 'error',
        message: `Lievito troppo basso (${profile.yeastPct}%). Rischio di non lievitazione. Min consigliato: 0.03%.`,
      })
    } else if (profile.yeastPct > 3.5) {
      warnings.push({
        id: 'yeast_too_high',
        category: 'yeast',
        severity: 'warning',
        message: `Lievito molto alto (${profile.yeastPct}%). Rischio di sapore sgradevole e over-proofing rapido. Max consigliato: 3.5%.`,
      })
    }
  }

  // ── Salt warnings ──
  if (profile.saltPct < defaults.saltPctRange[0]) {
    warnings.push({
      id: 'salt_low',
      category: 'salt',
      severity: 'warning',
      message: `Sale basso (${profile.saltPct}%) per ${defaults.type}. Range consigliato: ${defaults.saltPctRange[0]}–${defaults.saltPctRange[1]}%. Impasto potrebbe risultare debole.`,
    })
  } else if (profile.saltPct > defaults.saltPctRange[1]) {
    warnings.push({
      id: 'salt_high',
      category: 'salt',
      severity: 'warning',
      message: `Sale alto (${profile.saltPct}%) per ${defaults.type}. Range consigliato: ${defaults.saltPctRange[0]}–${defaults.saltPctRange[1]}%. Inibisce il lievito e risultato troppo salato.`,
    })
  }
  if (profile.saltPct > 3.0) {
    warnings.push({
      id: 'salt_extreme',
      category: 'salt',
      severity: 'error',
      message: `Sale molto alto (${profile.saltPct}%). Oltre il 3% il lievito viene fortemente inibito.`,
    })
  }

  // ── Fat warnings ──
  if (profile.fatPct > defaults.fatPctRange[1]) {
    warnings.push({
      id: 'fat_high',
      category: 'fat',
      severity: 'warning',
      message: `Grassi alti (${profile.fatPct}%) per ${defaults.type}. Range consigliato: ${defaults.fatPctRange[0]}–${defaults.fatPctRange[1]}%.`,
    })
  }
  if (profile.fatPct > 12 && defaults.type !== 'dolce') {
    warnings.push({
      id: 'fat_extreme',
      category: 'fat',
      severity: 'warning',
      message: `Grassi oltre il 12% rallentano fortemente il lievito. Richiede tecnica speciale (aggiunta in più fasi).`,
    })
  }

  // ── Hydration warnings ──
  if (profile.hydration > 90) {
    warnings.push({
      id: 'hyd_extreme',
      category: 'hydration',
      severity: 'warning',
      message: `Idratazione molto alta (${profile.hydration}%). Richiede farine molto forti (W > 350) e tecnica avanzata.`,
    })
  } else if (profile.hydration < 45) {
    warnings.push({
      id: 'hyd_low',
      category: 'hydration',
      severity: 'info',
      message: `Idratazione bassa (${profile.hydration}%). L'impasto sarà molto rigido.`,
    })
  }

  // ── Duration warnings ──
  if (profile.doughHours > 72) {
    warnings.push({
      id: 'hours_extreme',
      category: 'general',
      severity: 'info',
      message: `Durata impasto molto lunga (${profile.doughHours}h). Necessita tecnica del freddo e farine forti.`,
    })
  }

  return warnings
}

// maxRiseHoursForW → canonical source is rise-manager.ts, re-exported for backward compat
export { maxRiseHoursForW } from './rise-manager'
