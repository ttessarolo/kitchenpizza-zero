/**
 * RiseManager — Centralized rise/fermentation duration logic.
 *
 * Owns:
 * - Rise duration calculation (from flour W, yeast %, method, temperature)
 * - Temperature factor for rise (Q10-inspired exponential)
 * - Rise method lookup and defaults
 * - Rise validation and warnings
 *
 * Scientific references:
 * - [C] Casucci Cap. 24-31 (digestione, maturazione, enzimi)
 * - [C] Casucci Cap. 39, 44 (tempi di lievitazione, Formula L)
 * - Rise duration formula accounts for: W (flour strength), yeast %,
 *   starch damage, falling number, fiber, salt, sugar, fat, temperature, method
 */

import type { BlendedFlourProps, RiseMethod } from '@commons/types/recipe'
import { RISE_METHODS, YEAST_TYPES } from '../../local_data/rise-methods'

// Re-export config data
export { RISE_METHODS, YEAST_TYPES }

// ── Rise duration ──────────────────────────────────────────────

/**
 * Calculate rise duration in minutes.
 *
 * Base: 60 min (1h at standard conditions: W 280, yeast 2%, room temp, no inhibitors).
 *
 * Factors applied multiplicatively:
 * - Rise method factor (rm.tf): fridge 3.6x, ctrl18 1.4x, ctrl12 2.2x, room 1x
 * - Yeast factor: inversely proportional (2 / yPct). Less yeast → longer rise
 * - W factor: inversely proportional (280 / W). Stronger flour → shorter rise
 * - Starch damage: higher damage speeds fermentation slightly
 * - Falling number: lower FN → more amylase → faster rise
 * - Fiber factor: high fiber slows gluten development
 * - Yeast speed factor (ySF): fresh 1, madre 0.25-0.3
 * - Temperature factor (tf): from riseTemperatureFactor()
 * - Salt/sugar/fat: inhibit yeast above thresholds
 *
 * [C] Cap. 44 — Comprehensive rise calculation with all factors.
 */
export function calcRiseDuration(
  base: number,
  method: string,
  bp: BlendedFlourProps,
  yPct: number,
  ySF: number,
  tf: number,
  riseMethods: RiseMethod[] = RISE_METHODS as unknown as RiseMethod[],
  saltPct = 2.5,
  sugarPct = 0,
  fatPct = 0,
): number {
  const rm = riseMethods.find((m) => m.key === method) || riseMethods[0]
  const fnFactor = 300 / Math.max(bp.fallingNumber || 300, 150)
  const fiberFactor = 1 + Math.max(0, ((bp.fiber || 2.5) - 3) * 0.02)
  const saltFactor = 1 + Math.max(0, (saltPct - 2.5) * 0.1)
  const sugarFactor = 1 + Math.max(0, (sugarPct - 5) * 0.05)
  const fatFactor = 1 + Math.max(0, (fatPct - 3) * 0.02)
  return Math.round(
    ((base *
      rm.tf *
      (2 / Math.max(yPct, 0.5)) *
      (280 / Math.max(bp.W || 280, 50)) *
      (1 - ((bp.starchDamage || 7) - 7) * 0.02) *
      fnFactor *
      fiberFactor) /
      Math.max(ySF, 0.1)) *
      (tf || 1) *
      saltFactor *
      sugarFactor *
      fatFactor,
  )
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
export function riseTemperatureFactor(fdt: number, riseMethod: string): number {
  const coeff: Record<string, number> = { room: 1, ctrl18: 0.2, ctrl12: 0.1, fridge: 0.05 }
  return Math.pow(2, (-(fdt - 24) * (coeff[riseMethod] ?? 1)) / 10)
}

// ── Method lookup ──────────────────────────────────────────────

/** Get a rise method by key, fallback to 'room'. */
export function getRiseMethod(key: string): RiseMethod {
  return (RISE_METHODS as unknown as RiseMethod[]).find((m) => m.key === key)
    || (RISE_METHODS[0] as unknown as RiseMethod)
}

/** Get all available rise methods. */
export function getAllRiseMethods(): RiseMethod[] {
  return RISE_METHODS as unknown as RiseMethod[]
}

/** Get yeast type info by key. */
export function getYeastType(key: string) {
  return YEAST_TYPES.find((y) => y.key === key) || YEAST_TYPES[0]
}

// ── Warnings ───────────────────────────────────────────────────

export interface RiseWarning {
  id: string
  category: 'flour' | 'yeast' | 'general'
  severity: 'info' | 'warning' | 'error'
  message: string
}

/**
 * Maximum rise hours at room temperature for a given flour W.
 * Beyond this, the gluten network degrades.
 *
 * [C] Cap. 44 — Table W vs max hours.
 * (Re-exported from DoughManager for convenience — canonical source is here.)
 */
export function maxRiseHoursForW(W: number): number {
  if (W > 380) return 20
  if (W > 320) return 14
  if (W > 290) return 10
  if (W > 220) return 6
  if (W > 180) return 2
  return 1
}

/**
 * Get warnings for a rise node's configuration.
 *
 * Checks:
 * - Rise duration vs flour W capacity
 * - Extremely short or long durations
 * - Yeast type compatibility
 */
export function getRiseWarnings(ctx: {
  durationMin: number
  flourW: number
  yeastPct: number
  method: string
}): RiseWarning[] {
  const warnings: RiseWarning[] = []
  const hours = ctx.durationMin / 60
  const maxH = maxRiseHoursForW(ctx.flourW)

  // Only check room-temp equivalent (fridge extends tolerance)
  if (ctx.method === 'room' && hours > maxH) {
    warnings.push({
      id: 'rise_too_long_for_w',
      category: 'flour',
      severity: 'warning',
      message: `Farina W${Math.round(ctx.flourW)} supporta max ${maxH}h a temperatura ambiente. Durata attuale: ${Math.round(hours * 10) / 10}h.`,
    })
  }

  if (ctx.durationMin < 15) {
    warnings.push({
      id: 'rise_too_short',
      category: 'general',
      severity: 'info',
      message: `Lievitazione molto breve (${ctx.durationMin} min). L'impasto potrebbe non svilupparsi sufficientemente.`,
    })
  }

  return warnings
}
