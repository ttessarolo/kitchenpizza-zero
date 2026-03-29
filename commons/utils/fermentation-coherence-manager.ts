/**
 * FermentationCoherenceManager — Cross-node fermentation validation.
 *
 * Validates that rise phases in the recipe graph are coherent with each other,
 * with portioning settings (doughHours, yeastPct), and with flour properties.
 *
 * Key concept: **Equivalent Room-Temperature Hours**
 * Each rise phase's wall-clock time is converted to equivalent room-temp hours
 * using the rise method's time factor (tf). This allows comparing phases at
 * different temperatures on the same scale.
 *
 * Formula: equivalentRoomHours = Σ(baseDur_i / 60 / tf_i)
 *
 * Scientific references:
 * - [C] Casucci Cap. 39, 44 — Temperature factor, fermentation kinetics
 * - [C] Casucci Cap. 31 — Maturation, cold retard effects
 */

import type { ScienceProvider } from './science/science-provider'
import { evaluateRules, type RuleResult } from './science/rule-engine'
import { evaluateFormula } from './science/formula-engine'
import { evaluatePiecewise } from './science/formula-engine'

// ── Types ─────────────────────────────────────────────────────

export interface RisePhaseInfo {
  nodeId: string
  title: string
  riseMethod: string  // 'room' | 'fridge' | 'ctrl18' | 'ctrl12'
  baseDur: number     // minutes
  tf: number          // time factor from RISE_METHODS
  userOverride: boolean
}

interface NodeSequenceEntry {
  nodeId: string
  type: string
  riseMethod?: string
}

// ── Equivalent Room Hours ─────────────────────────────────────

/**
 * Convert a set of rise phases to equivalent room-temperature hours.
 * Each phase's wall-clock time is divided by its tf (time factor).
 * Room (tf=1) is 1:1, fridge (tf=3.6) is ~3.6x slower.
 */
export function calcEquivalentRoomHours(phases: RisePhaseInfo[]): number {
  if (phases.length === 0) return 0
  return phases.reduce((sum, p) => sum + (p.baseDur / 60) / p.tf, 0)
}

// ── Cross-Node Validation ────────────────────────────────────

/**
 * Full cross-node fermentation coherence validation.
 * Computes derived values and evaluates science rules from JSON.
 *
 * Checks:
 * - Total equivalent time vs portioning.doughHours (mismatch)
 * - Total equivalent time vs min for flour W (insufficient)
 * - Total equivalent time vs max for flour W (over-capacity)
 * - Max fridge wall-clock hours (>72h over-fermentation)
 * - Fridge→bake sequence without room-temp acclimatization
 * - Yeast% mismatch between portioning and expected for phases
 */
export function validateFermentationCoherence(
  provider: ScienceProvider,
  phases: RisePhaseInfo[],
  doughProps: { flourW: number; yeastPct: number },
  portioning: { doughHours: number; yeastPct: number },
  graphContext: { nodeSequence: NodeSequenceEntry[] },
): RuleResult[] {
  const equivalentRoomHours = Math.round(calcEquivalentRoomHours(phases) * 100) / 100

  // Get flour W limits from science JSON
  const minHoursForW = evaluatePiecewise(
    provider.getPiecewise('min_fermentation_hours_for_W'),
    { W: doughProps.flourW },
  ) as number

  const maxHoursForW = evaluatePiecewise(
    provider.getPiecewise('max_rise_hours_for_W'),
    { W: doughProps.flourW },
  ) as number

  // Mismatch percentage vs portioning.doughHours
  const doughHours = portioning.doughHours
  const mismatchPct = doughHours > 0
    ? Math.round(Math.abs(equivalentRoomHours - doughHours) / doughHours * 100)
    : 0

  // Max fridge wall-clock hours (any single fridge phase)
  const fridgePhases = phases.filter((p) => p.riseMethod === 'fridge')
  const maxFridgeWallHours = fridgePhases.length > 0
    ? Math.round(Math.max(...fridgePhases.map((p) => p.baseDur / 60)) * 100) / 100
    : 0

  // Acclimatization check: fridge rise directly followed by bake/pre_bake
  let fridgeFollowedByBake = false
  let fridgeNodeTitle = ''
  let fridgeNodeId = ''
  const seq = graphContext.nodeSequence
  for (let i = 0; i < seq.length - 1; i++) {
    if (seq[i].type === 'rise' && seq[i].riseMethod === 'fridge') {
      // Look for next non-rise node after this fridge
      let nextNonRise = null
      for (let j = i + 1; j < seq.length; j++) {
        if (seq[j].type !== 'rise' || seq[j].riseMethod !== 'fridge') {
          nextNonRise = seq[j]
          break
        }
      }
      if (nextNonRise && (nextNonRise.type === 'bake' || nextNonRise.type === 'pre_bake')) {
        // Check there's no room-temp rise between fridge and bake
        let hasRoomRise = false
        for (let j = i + 1; j < seq.length; j++) {
          if (seq[j] === nextNonRise) break
          if (seq[j].type === 'rise' && seq[j].riseMethod !== 'fridge') {
            hasRoomRise = true
            break
          }
        }
        if (!hasRoomRise) {
          fridgeFollowedByBake = true
          const phase = phases.find((p) => p.nodeId === seq[i].nodeId)
          fridgeNodeTitle = phase?.title ?? 'Fridge rise'
          fridgeNodeId = seq[i].nodeId
          break
        }
      }
    }
  }

  // Expected yeast% based on equivalent room hours (Formula L)
  let expectedYeastPct = portioning.yeastPct
  if (equivalentRoomHours > 0) {
    try {
      const formulaBlock = provider.getFormula('yeast_pct')
      expectedYeastPct = Math.round(evaluateFormula(formulaBlock, {
        hours: equivalentRoomHours,
        tempC: 24, // default room temperature
        hydration: 56, // default hydration for Formula L
      }) * 1000) / 1000
    } catch {
      // If formula not available, skip yeast comparison
    }
  }

  const actualYeastPct = portioning.yeastPct
  const yeastMismatchPct = actualYeastPct > 0
    ? Math.round(Math.abs(expectedYeastPct - actualYeastPct) / actualYeastPct * 100)
    : 0

  // Build context for rule engine
  const ctx: Record<string, unknown> = {
    equivalentRoomHours,
    doughHours,
    flourW: doughProps.flourW,
    minHoursForW,
    maxFridgeWallHours,
    fridgeFollowedByBake,
    fridgeNodeTitle,
    fridgeNodeId,
    expectedYeastPct,
    actualYeastPct,
    // Prefixed computed values for rule conditions
    _mismatchPct: mismatchPct,
    _minFermentationHoursForW: minHoursForW,
    _maxRiseHoursForW: maxHoursForW,
    _yeastMismatchPct: yeastMismatchPct,
    maxHoursForW,
    mismatchPct,
  }

  return evaluateRules(provider.getRules('fermentation_coherence'), ctx)
}

// ── Phase Redistribution ──────────────────────────────────────

/**
 * Suggest new baseDur values to redistribute rise phases
 * so that their equivalent room-hours sum matches the target.
 * Preserves user-overridden phases; adjusts only non-overridden ones.
 */
export function suggestPhaseRedistribution(
  targetEquivHours: number,
  currentPhases: RisePhaseInfo[],
): { nodeId: string; newBaseDur: number }[] {
  const adjustable = currentPhases.filter((p) => !p.userOverride)
  if (adjustable.length === 0) return []

  // Current equivalent hours from adjustable phases only
  const fixedEquiv = currentPhases
    .filter((p) => p.userOverride)
    .reduce((sum, p) => sum + (p.baseDur / 60) / p.tf, 0)

  const remainingEquiv = Math.max(0, targetEquivHours - fixedEquiv)
  const currentAdjustableEquiv = adjustable.reduce((sum, p) => sum + (p.baseDur / 60) / p.tf, 0)

  if (currentAdjustableEquiv <= 0) return []

  const scaleFactor = remainingEquiv / currentAdjustableEquiv

  return adjustable.map((p) => ({
    nodeId: p.nodeId,
    newBaseDur: Math.max(15, Math.round(p.baseDur * scaleFactor)),
  }))
}

// ── Yeast Suggestion ──────────────────────────────────────────

/**
 * Suggest yeast% for given equivalent room-temperature hours.
 * Uses Formula L from ScienceProvider.
 */
export function suggestYeastPct(
  provider: ScienceProvider,
  equivalentRoomHours: number,
  tempC = 24,
  hydration = 56,
): number {
  if (equivalentRoomHours <= 0) return 0
  const formulaBlock = provider.getFormula('yeast_pct')
  return Math.round(evaluateFormula(formulaBlock, {
    hours: equivalentRoomHours,
    tempC,
    hydration,
  }) * 1000) / 1000
}
