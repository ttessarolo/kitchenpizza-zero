/**
 * SauceManager — pure functions for sauce layer calculations.
 *
 * Covers reduction volume, sauce duration, and warnings.
 * All formulas come from ScienceProvider JSON when available.
 */

import type { SauceMasterConfig } from '@commons/types/recipe-layers'
import type { ScienceProvider } from './science/science-provider'
import { evaluateRules } from './science/rule-engine'
import type { RuleResult } from './science/rule-engine'
import { evaluateFormula } from './science/formula-engine'

// ── Constants (fallbacks when science formula unavailable) ────

/** Default evaporation rate: 15% volume loss per 10 min without lid. */
const DEFAULT_EVAP_RATE = 0.15

/** Lid reduces evaporation by ~60%. */
const LID_FACTOR = 0.4

// ── Per-subtype defaults (from science/catalogs/sauce-types.json) ──

const SAUCE_SUBTYPE_DEFAULTS: Record<string, Partial<SauceMasterConfig>> = {
  sugo: { targetVolume: 500, targetConsistency: 'medium', shelfLife: 3 },
  emulsione: { targetVolume: 300, targetConsistency: 'thin', shelfLife: 2 },
  pesto: { targetVolume: 250, targetConsistency: 'thick', shelfLife: 5 },
  crema: { targetVolume: 400, targetConsistency: 'medium', shelfLife: 2 },
  ragu: { targetVolume: 600, targetConsistency: 'thick', shelfLife: 4 },
  besciamella: { targetVolume: 500, targetConsistency: 'medium', shelfLife: 2 },
}

/** Returns sensible defaults for a sauce subtype. */
export function getDefaults(subtype: string): Partial<SauceMasterConfig> {
  return SAUCE_SUBTYPE_DEFAULTS[subtype] ?? {}
}

// ── 1. calcReductionVolume ───────────────────────────────────

/**
 * Calculate the final volume of a sauce after cooking/reduction.
 *
 * Uses the `sauce_reduction_volume` formula from ScienceProvider if available,
 * otherwise falls back to built-in constants.
 *
 * @param startVolume — initial volume in ml
 * @param cookDuration — cooking time in minutes
 * @param lidUsed — whether a lid is used (reduces evaporation)
 * @returns final volume in ml
 */
export function calcReductionVolume(
  provider: ScienceProvider,
  startVolume: number,
  cookDuration: number,
  lidUsed: boolean,
): number {
  const lidFactor = lidUsed ? LID_FACTOR : 1.0

  try {
    const formula = provider.getFormula('sauce_reduction_volume')
    return evaluateFormula(formula, { startVolume, cookDuration, lidFactor })
  } catch {
    // Fallback: manual calculation with defaults
    const loss = Math.min(cookDuration * DEFAULT_EVAP_RATE * lidFactor / 100, 0.8)
    return Math.max(0, Math.round(startVolume * (1 - loss)))
  }
}

// ── 2. calcSauceDuration ─────────────────────────────────────

/**
 * Estimate total sauce cooking duration based on type, volume, and method.
 *
 * Uses the sauce_types catalog for baseMinPerLiter if available.
 *
 * @param sauceType — key from sauce_types catalog
 * @param volume — target volume in ml
 * @param method — 'simmer' | 'rapid' | 'cold'
 * @returns estimated duration in minutes
 */
export function calcSauceDuration(
  provider: ScienceProvider,
  sauceType: string,
  volume: number,
  method: 'simmer' | 'rapid' | 'cold',
): number {
  // Lookup base time from catalog
  const catalog = provider.getCatalog('sauce_types')
  const entry = catalog.find((e) => (e as Record<string, unknown>).key === sauceType) as
    | Record<string, unknown>
    | undefined

  const baseMinPerLiter = Number(entry?.baseMinPerLiter ?? 30)

  // Volume factor: scale linearly from liters
  const volumeLiters = volume / 1000
  let duration = baseMinPerLiter * volumeLiters

  // Method multiplier
  switch (method) {
    case 'rapid':
      duration *= 0.6
      break
    case 'cold':
      duration = 5 // minimal mixing time
      break
    case 'simmer':
    default:
      // base rate, no modifier
      break
  }

  return Math.round(Math.max(duration, 1))
}

// ── 3. getSauceWarnings ──────────────────────────────────────

/**
 * Evaluate all sauce-related warnings against a profile context.
 *
 * Uses `provider.getRules('sauce')` + `evaluateRules`.
 */
export function getSauceWarnings(
  provider: ScienceProvider,
  profile: Record<string, unknown>,
): RuleResult[] {
  const rules = provider.getRules('sauce')
  return evaluateRules(rules, profile)
}
