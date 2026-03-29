/**
 * PastryManager — pure functions for pastry layer calculations.
 *
 * Covers chocolate tempering validation, custard pasteurization check,
 * meringue ratio calculation, and warnings via ScienceProvider.
 */

import type { ScienceProvider } from './science/science-provider'
import { evaluateRules } from './science/rule-engine'
import type { RuleResult } from './science/rule-engine'
import { evaluateClassification } from './science/formula-engine'

// ── Constants ────────────────────────────────────────────────

/** Tempering ranges per chocolate type: [melt, coolMin, coolMax, workMin, workMax] */
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
  const range = TEMPER_RANGES[chocolateType]

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
  _provider: ScienceProvider,
  temp: number,
  duration: number,
  hasEggs: boolean,
): { safe: boolean } {
  if (!hasEggs) return { safe: true }
  return { safe: temp >= CUSTARD_SAFE_TEMP && duration >= CUSTARD_MIN_DURATION_S }
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
  _provider: ScienceProvider,
  eggWhiteG: number,
  sugarG: number,
): { ratio: number; stable: boolean } {
  if (eggWhiteG <= 0) return { ratio: 0, stable: false }

  const ratio = Math.round((sugarG / eggWhiteG) * 100) / 100
  return { ratio, stable: ratio >= MERINGUE_STABLE_RATIO }
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
