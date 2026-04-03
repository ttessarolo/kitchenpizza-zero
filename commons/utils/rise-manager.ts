/**
 * RiseManager — Centralized rise/fermentation duration logic.
 *
 * Owns:
 * - Rise duration calculation (via ScienceProvider factor chain)
 * - Temperature factor for rise (Q10-inspired exponential)
 * - Rise method lookup and defaults
 * - Rise validation and warnings (via ScienceProvider rules)
 * - Max rise hours for W (via ScienceProvider piecewise)
 *
 * Scientific references:
 * - [C] Casucci Cap. 24-31 (digestione, maturazione, enzimi)
 * - [C] Casucci Cap. 39, 44 (tempi di lievitazione, Formula L)
 * - Rise duration formula accounts for: W (flour strength), yeast %,
 *   starch damage, falling number, fiber, salt, sugar, fat, temperature, method
 */

import type { RiseMethod } from '@commons/types/recipe'

// ── Science imports ────────────────────────────────────────────

import type { ScienceProvider } from './science/science-provider'
import { evaluateFactorChain, evaluatePiecewise } from './science/formula-engine'
import { evaluateRules, type RuleResult } from './science/rule-engine'

// ── Rise duration ──────────────────────────────────────────────

/**
 * Calculate rise duration in minutes using the ScienceProvider.
 * Reads the factor chain from /science/ JSON.
 *
 * The factor chain applies multiplicative factors:
 * - Rise method factor
 * - Yeast factor (inversely proportional)
 * - W factor (inversely proportional)
 * - Starch damage, falling number, fiber
 * - Yeast speed factor (fresh vs madre)
 * - Temperature factor
 * - Salt/sugar/fat inhibition
 *
 * [C] Cap. 44 — Comprehensive rise calculation with all factors.
 */
export function calcRiseDuration(
  provider: ScienceProvider,
  inputs: Record<string, number | string>,
  catalogs?: Record<string, Record<string, unknown>[]>,
): number {
  return evaluateFactorChain(provider.getFactorChain('rise_duration'), inputs as Record<string, number>, catalogs)
}

/**
 * Exponential temperature factor for rise based on FDT and rise method.
 *
 * Uses a Q10-inspired model: every 10°C increase halves the rise time (for room method).
 * Controlled methods (fridge, ctrl18, ctrl12) dampen the effect because temperature
 * is externally managed.
 *
 * Method coefficients:
 * - room: 1.0 (full temperature effect)
 * - ctrl18: 0.2 (mostly controlled, minor effect)
 * - ctrl12: 0.1 (heavily controlled)
 * - fridge: 0.05 (nearly no FDT effect — fridge dominates)
 *
 * [C] Cap. 39 — Temperature and fermentation kinetics.
 */
export function riseTemperatureFactor(provider: ScienceProvider, fdt: number, riseMethod: string): number {
  let coeff = 1
  let baseline = 24
  const catalog = provider.getCatalog('rise_methods')
  const entry = (catalog as any[]).find((e: any) => e.key === riseMethod)
  if (entry?.q10Coeff != null) coeff = entry.q10Coeff
  if ((catalog as any).baselineTemp != null) baseline = (catalog as any).baselineTemp
  return Math.pow(2, (-(fdt - baseline) * coeff) / 10)
}

// ── Method lookup ──────────────────────────────────────────────

/** Get a rise method by key, fallback to first entry. */
export function getRiseMethod(key: string, provider: ScienceProvider): RiseMethod {
  const catalog = provider.getCatalog('rise_methods') as unknown as RiseMethod[]
  return catalog.find((m) => m.key === key) || catalog[0]
}

/** Get all available rise methods. */
export function getAllRiseMethods(provider: ScienceProvider): RiseMethod[] {
  return provider.getCatalog('rise_methods') as unknown as RiseMethod[]
}

/** Get yeast type info by key. */
export function getYeastType(key: string, provider: ScienceProvider) {
  const block = provider.getBlock('rise_methods') as any
  const yeastTypes: any[] = block?.yeastTypes ?? []
  return yeastTypes.find((y: any) => y.key === key) || yeastTypes[0]
}

// ── Max rise hours ─────────────────────────────────────────────

/**
 * Maximum rise hours at room temperature for a given flour W.
 * Beyond this, the gluten network degrades.
 * Uses the ScienceProvider to read the piecewise function from /science/ JSON.
 *
 * [C] Cap. 44 — Table W vs max hours.
 * (Re-exported from DoughManager for convenience — canonical source is here.)
 */
export function maxRiseHoursForW(
  provider: ScienceProvider,
  W: number,
): number {
  return evaluatePiecewise(provider.getPiecewise('max_rise_hours_for_W'), { W }) as number
}

// ── Warnings ───────────────────────────────────────────────────

/**
 * Get warnings for a rise node's configuration.
 * Uses the ScienceProvider to read rules from /science/ JSON.
 * Returns RuleResult[] with messageKey (not resolved text).
 *
 * Checks:
 * - Rise duration vs flour W capacity
 * - Extremely short or long durations
 * - Yeast type compatibility
 */
export function getRiseWarnings(
  provider: ScienceProvider,
  ctx: { riseMethod: string; hours: number; durationMin: number; flourW: number; maxH?: number },
): RuleResult[] {
  const enrichedCtx: Record<string, unknown> = {
    ...ctx,
    _maxHoursForW: ctx.maxH ?? maxRiseHoursForW(provider, ctx.flourW),
  }
  return evaluateRules(provider.getRules('rise'), enrichedCtx)
}

// Re-export RuleResult for consumers that need the warning type
export type { RuleResult } from './science/rule-engine'
