/**
 * PrepLayerManager — pure functions for prep (ingredient preparation) layer.
 *
 * Covers food-safety room-time limits, prep duration estimates, and warnings.
 */

import type { ScienceProvider } from './science/science-provider'
import { evaluateRules } from './science/rule-engine'
import type { RuleResult } from './science/rule-engine'

// ── Constants ────────────────────────────────────────────────

/** Safe room-temperature limits in minutes by category. */
const SAFE_ROOM_TIME: Record<string, number> = {
  protein: 120,
  dairy: 60,
  vegetable: 240,
  grain: 480,
  fruit: 240,
}

/** Average grams per minute for different cut styles. */
const CUT_SPEED: Record<string, number> = {
  julienne: 80,
  brunoise: 50,
  chiffonade: 120,
  dice: 100,
  slice: 150,
  mince: 60,
  rough: 200,
}

// ── 1. calcSafeRoomTime ──────────────────────────────────────

/**
 * Calculate the maximum safe time an ingredient can stay at room temperature.
 *
 * Cooked ingredients get 50% more time (reduced bacterial load).
 *
 * @param ingredientCategory — 'protein' | 'dairy' | 'vegetable' | 'grain' | 'fruit'
 * @param isCooked — whether the ingredient has been cooked
 * @returns safe time in minutes
 */
export function calcSafeRoomTime(
  _provider: ScienceProvider,
  ingredientCategory: string,
  isCooked: boolean,
): number {
  const baseTime = SAFE_ROOM_TIME[ingredientCategory] ?? 120
  return isCooked ? Math.round(baseTime * 1.5) : baseTime
}

// ── 2. calcPrepDuration ──────────────────────────────────────

/**
 * Estimate preparation duration based on cut style and quantity.
 *
 * @param cutStyle — julienne, brunoise, dice, slice, mince, chiffonade, rough
 * @param quantityGrams — total grams to prepare
 * @returns estimated duration in minutes
 */
export function calcPrepDuration(
  _provider: ScienceProvider,
  cutStyle: string,
  quantityGrams: number,
): number {
  const gramsPerMinute = CUT_SPEED[cutStyle] ?? 100
  return Math.max(1, Math.round(quantityGrams / gramsPerMinute))
}

// ── 3. getPrepWarnings ───────────────────────────────────────

/**
 * Evaluate all prep-related warnings against a profile context.
 *
 * Uses `provider.getRules('prep')` + `evaluateRules`.
 */
export function getPrepWarnings(
  provider: ScienceProvider,
  profile: Record<string, unknown>,
): RuleResult[] {
  const rules = provider.getRules('prep')
  return evaluateRules(rules, profile)
}
