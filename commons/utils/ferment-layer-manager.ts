/**
 * FermentLayerManager — pure functions for fermentation layer calculations.
 *
 * Covers brine concentration, fermentation duration, and warnings.
 * Uses ScienceProvider for piecewise duration lookup and rule evaluation.
 */

import type { ScienceProvider } from './science/science-provider'
import { evaluateRules } from './science/rule-engine'
import type { RuleResult } from './science/rule-engine'
import { evaluatePiecewise } from './science/formula-engine'

// ── 1. calcBrineConcentration ────────────────────────────────

/**
 * Calculate brine salt concentration as a percentage of total weight.
 *
 * @param saltG — grams of salt
 * @param vegetableG — grams of vegetables
 * @param waterG — grams of water (0 for dry-salt ferments)
 * @returns { pct: salt percentage, safe: whether above minimum }
 */
export function calcBrineConcentration(
  provider: ScienceProvider,
  saltG: number,
  vegetableG: number,
  waterG: number,
): { pct: number; safe: boolean } {
  const block = provider.getBlock('ferment_layer_constants') as any
  const minSafeSaltPct = block?.minSafeSaltPct ?? 2
  const totalWeight = saltG + vegetableG + waterG
  if (totalWeight <= 0) return { pct: 0, safe: false }

  const pct = Math.round((saltG / totalWeight) * 1000) / 10 // 1 decimal
  return { pct, safe: pct >= minSafeSaltPct }
}

// ── 2. calcFermentDuration ───────────────────────────────────

/**
 * Estimate fermentation duration range based on type, temperature, and salt.
 *
 * Uses `ferment_duration_by_temp` piecewise from ScienceProvider.
 * Higher salt slows fermentation: +10% duration per percentage point above 3%.
 *
 * @param fermentType — key from ferment_types catalog
 * @param tempC — ambient temperature in Celsius
 * @param saltPct — salt percentage
 * @returns { minDays, maxDays }
 */
export function calcFermentDuration(
  provider: ScienceProvider,
  _fermentType: string,
  tempC: number,
  saltPct: number,
): { minDays: number; maxDays: number } {
  const block = provider.getBlock('ferment_layer_constants') as any
  let baseDuration: { minDays: number; maxDays: number }

  try {
    const result = evaluatePiecewise(
      provider.getPiecewise('ferment_duration_by_temp'),
      { tempC },
    ) as { minDays: number; maxDays: number }
    baseDuration = result
  } catch {
    // Fallback from provider constants
    const ranges: { maxTemp: number; minDays: number; maxDays: number }[] = block?.tempRanges ?? []
    const match = ranges.find(r => tempC < r.maxTemp)
    baseDuration = match
      ? { minDays: match.minDays, maxDays: match.maxDays }
      : { minDays: 3, maxDays: 7 }
  }

  // Salt adjustment from provider
  const saltAdj = block?.saltAdjustment ?? { threshold: 3, factorPerPct: 0.1 }
  const saltAdjust = saltPct > saltAdj.threshold
    ? 1 + (saltPct - saltAdj.threshold) * saltAdj.factorPerPct
    : 1
  return {
    minDays: Math.round(baseDuration.minDays * saltAdjust),
    maxDays: Math.round(baseDuration.maxDays * saltAdjust),
  }
}

// ── 3. getFermentWarnings ────────────────────────────────────

/**
 * Evaluate all fermentation-related warnings against a profile context.
 *
 * Uses `provider.getRules('ferment')` + `evaluateRules`.
 */
export function getFermentWarnings(
  provider: ScienceProvider,
  profile: Record<string, unknown>,
): RuleResult[] {
  const rules = provider.getRules('ferment')
  return evaluateRules(rules, profile)
}
