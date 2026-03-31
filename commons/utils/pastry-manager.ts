/**
 * PastryManager — pure functions for pastry layer calculations.
 *
 * Covers chocolate tempering validation, custard pasteurization check,
 * meringue ratio calculation, and warnings via ScienceProvider.
 */

import type { PastryMasterConfig } from '@commons/types/recipe-layers'
import type { ScienceProvider } from './science/science-provider'
import { evaluateRules } from './science/rule-engine'
import type { RuleResult } from './science/rule-engine'
import { evaluateClassification } from './science/formula-engine'

// ── Constants (hardcoded fallbacks, prefer ScienceProvider) ──

// ── Per-subtype defaults ──

const PASTRY_SUBTYPE_DEFAULTS: Record<string, Partial<PastryMasterConfig>> = {
  cioccolato: { targetWeight: 300, servings: 6, temperatureNotes: '' },
  crema: { targetWeight: 500, servings: 6, temperatureNotes: '' },
  meringa: { targetWeight: 200, servings: 8, temperatureNotes: '' },
  mousse: { targetWeight: 400, servings: 6, temperatureNotes: '' },
  glassa: { targetWeight: 250, servings: 8, temperatureNotes: '' },
  generic: { targetWeight: 500, servings: 6, temperatureNotes: '' },
}

/** Returns sensible defaults for a pastry subtype. Reads from ScienceProvider when available. */
export function getDefaults(subtype: string, provider?: ScienceProvider): Partial<PastryMasterConfig> {
  if (provider) {
    const d = provider.getDefaults('pastry_subtype_defaults', subtype, null) as Record<string, unknown>
    if (d && Object.keys(d).length > 0 && d.targetWeight != null) {
      return d as unknown as Partial<PastryMasterConfig>
    }
  }
  return PASTRY_SUBTYPE_DEFAULTS[subtype] ?? {}
}

/** Tempering ranges per chocolate type (fallback) */
const TEMPER_RANGES: Record<string, { workMin: number; workMax: number }> = {
  dark: { workMin: 31, workMax: 32 },
  milk: { workMin: 29, workMax: 30 },
  white: { workMin: 27, workMax: 28 },
}

/** Minimum custard temperature for pasteurization (Celsius). */
const CUSTARD_SAFE_TEMP = 82

/** Minimum custard duration at safe temp (seconds). */
const CUSTARD_MIN_DURATION_S = 10

/** Minimum stable sugar:egg-white ratio for meringue. */
const MERINGUE_STABLE_RATIO = 1.5

// ── 1. validateTemperingCurve ────────────────────────────────

/**
 * Validate a chocolate tempering curve.
 *
 * Checks that melt, cool, and work temperatures are within valid ranges
 * for the given chocolate type. Uses the `pastry_temper_zone` classification
 * from ScienceProvider for zone labeling.
 *
 * @returns { valid, warnings } — valid is true if workTemp is in working zone
 */
export function validateTemperingCurve(
  provider: ScienceProvider,
  chocolateType: string,
  meltTemp: number,
  coolTemp: number,
  workTemp: number,
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = []

  // Try to read temper ranges from provider defaults block
  let range = TEMPER_RANGES[chocolateType]
  try {
    const block = provider.getBlock('pastry_subtype_defaults') as any
    if (block?.temperRanges?.[chocolateType]) {
      range = block.temperRanges[chocolateType]
    }
  } catch { /* fallback to hardcoded */ }

  if (!range) {
    return { valid: false, warnings: ['unknown_chocolate_type'] }
  }

  // Classify the working temperature
  let zone: string
  try {
    zone = evaluateClassification(
      provider.getClassification('pastry_temper_zone'),
      { workTemp },
    )
  } catch {
    // Fallback: manual classification
    zone = workTemp < range.workMin ? 'too_cold' : workTemp > range.workMax ? 'over_tempered' : 'working_zone'
  }

  const valid = zone === 'working_zone'

  if (zone === 'too_cold') warnings.push('work_temp_too_cold')
  if (zone === 'seeding_zone') warnings.push('work_temp_in_seeding_zone')
  if (zone === 'over_tempered') warnings.push('work_temp_over_tempered')
  if (zone === 'melted') warnings.push('work_temp_melted')

  // Melt temp should be above work temp
  if (meltTemp < workTemp) warnings.push('melt_temp_below_work')

  // Cool temp should be below work temp
  if (coolTemp > workTemp) warnings.push('cool_temp_above_work')

  return { valid, warnings }
}

// ── 2. checkCustardPasteurization ────────────────────────────

/**
 * Check if a custard has been pasteurized based on temperature and duration.
 *
 * Safe pasteurization requires reaching 82C for at least 10 seconds.
 *
 * @param temp — peak temperature in Celsius
 * @param duration — time at peak temperature in seconds
 * @param hasEggs — whether the custard contains eggs
 * @returns { safe } — true if pasteurized or no eggs present
 */
export function checkCustardPasteurization(
  provider: ScienceProvider,
  temp: number,
  duration: number,
  hasEggs: boolean,
): { safe: boolean } {
  if (!hasEggs) return { safe: true }

  let safeTemp = CUSTARD_SAFE_TEMP
  let minDur = CUSTARD_MIN_DURATION_S
  try {
    const block = provider.getBlock('pastry_subtype_defaults') as any
    if (block?.custard?.safeTemp != null) safeTemp = block.custard.safeTemp
    if (block?.custard?.minDurationS != null) minDur = block.custard.minDurationS
  } catch { /* fallback to hardcoded */ }

  return { safe: temp >= safeTemp && duration >= minDur }
}

// ── 3. calcMeringueRatio ─────────────────────────────────────

/**
 * Calculate the sugar-to-egg-white ratio for meringue stability.
 *
 * A ratio of >= 1.5 is considered stable for French meringue.
 * Italian and Swiss meringue can work with lower ratios due to heat.
 *
 * @param eggWhiteG — grams of egg whites
 * @param sugarG — grams of sugar
 * @returns { ratio, stable }
 */
export function calcMeringueRatio(
  provider: ScienceProvider,
  eggWhiteG: number,
  sugarG: number,
): { ratio: number; stable: boolean } {
  if (eggWhiteG <= 0) return { ratio: 0, stable: false }

  let stableRatio = MERINGUE_STABLE_RATIO
  try {
    const block = provider.getBlock('pastry_subtype_defaults') as any
    if (block?.meringue?.stableRatio != null) stableRatio = block.meringue.stableRatio
  } catch { /* fallback to hardcoded */ }

  const ratio = Math.round((sugarG / eggWhiteG) * 100) / 100
  return { ratio, stable: ratio >= stableRatio }
}

// ── 4. getPastryWarnings ─────────────────────────────────────

/**
 * Evaluate all pastry-related warnings against a profile context.
 *
 * Uses `provider.getRules('pastry')` + `evaluateRules`.
 */
export function getPastryWarnings(
  provider: ScienceProvider,
  profile: Record<string, unknown>,
): RuleResult[] {
  const rules = provider.getRules('pastry')
  return evaluateRules(rules, profile)
}
