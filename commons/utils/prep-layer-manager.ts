/**
 * PrepLayerManager — pure functions for prep (ingredient preparation) layer.
 *
 * Covers food-safety room-time limits, prep duration estimates, and warnings.
 */

import type { ScienceProvider } from './science/science-provider'
import { evaluateRules } from './science/rule-engine'
import type { RuleResult } from './science/rule-engine'

// ── 1. calcSafeRoomTime ──────────────────────────────────────

/**
 * Calculate the maximum safe time an ingredient can stay at room temperature.
 *
 * Cooked ingredients get extra time (reduced bacterial load).
 * All values read from ScienceProvider (`prep_safety_and_speed` block).
 *
 * @param ingredientCategory — 'protein' | 'dairy' | 'vegetable' | 'grain' | 'fruit'
 * @param isCooked — whether the ingredient has been cooked
 * @returns safe time in minutes
 */
export function calcSafeRoomTime(
  provider: ScienceProvider,
  ingredientCategory: string,
  isCooked: boolean,
): number {
  const block = provider.getBlock('prep_safety_and_speed') as any
  const safeRoomTime: Record<string, number> = block?.safeRoomTime ?? {}
  const defaultTime = block?.defaultSafeTime ?? 120
  const cookedMult = block?.cookedMultiplier ?? 1.5
  const baseTime = safeRoomTime[ingredientCategory] ?? defaultTime
  return isCooked ? Math.round(baseTime * cookedMult) : baseTime
}

// ── 2. calcPrepDuration ──────────────────────────────────────

/**
 * Estimate preparation duration based on cut style and quantity.
 *
 * All values read from ScienceProvider (`prep_safety_and_speed` block).
 *
 * @param cutStyle — julienne, brunoise, dice, slice, mince, chiffonade, rough
 * @param quantityGrams — total grams to prepare
 * @returns estimated duration in minutes
 */
export function calcPrepDuration(
  provider: ScienceProvider,
  cutStyle: string,
  quantityGrams: number,
): number {
  const block = provider.getBlock('prep_safety_and_speed') as any
  const cutSpeed: Record<string, number> = block?.cutSpeed ?? {}
  const defaultSpeed = block?.defaultCutSpeed ?? 100
  const gramsPerMinute = cutSpeed[cutStyle] ?? defaultSpeed
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
