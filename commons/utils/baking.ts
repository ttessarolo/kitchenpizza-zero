import type { OvenConfig } from '@commons/types/recipe'
import type { ActionableWarning } from '@commons/types/recipe-graph'
import { BAKING_PROFILES, type BakingProfile } from '../../local_data/baking-profiles'
import { evaluateAdvisories as _evaluateAdvisories } from './advisory-manager'
import { ADVISORY_RULES as _ADVISORY_RULES } from './advisory-rules'

/**
 * Look up the best matching baking profile for a recipe type/subtype.
 * First tries exact subtype match, then falls back to type-level default (subtype: null).
 */
export function getBakingProfile(
  recipeType: string,
  recipeSubtype: string | null,
): BakingProfile | null {
  const exact = BAKING_PROFILES.find(
    (p) => p.type === recipeType && p.subtype === recipeSubtype,
  )
  if (exact) return exact
  return (
    BAKING_PROFILES.find((p) => p.type === recipeType && p.subtype === null) ??
    null
  )
}

/**
 * Calculate baking duration in minutes based on the baking profile, oven config, and dough thickness.
 */
export function calcBakeDuration(
  profile: BakingProfile,
  ovenCfg: OvenConfig,
  thickness: number,
): number {
  const [tMin, tMax] = profile.timeRange
  const baseTime = (tMin + tMax) / 2

  // Temperature adjustment: inversely proportional to oven temp
  const tempRatio = profile.refTemp / Math.max(ovenCfg.temp, 100)

  // Material thermal factor
  const matFactor = profile.materialFactors[ovenCfg.panType] ?? 1.0

  // Ventilated mode reduces baking time ~15%
  const modeFactor = ovenCfg.ovenMode === 'fan' ? 0.85 : 1.0

  // Thickness adjustment (only for tray-based products with baseThickness > 0)
  let thickFactor = 1.0
  if (profile.baseThickness > 0 && thickness > 0) {
    const delta = (thickness - profile.baseThickness) / 0.1
    thickFactor = 1 + delta * profile.thicknessFactor
  }

  return Math.max(1, Math.round(baseTime * tempRatio * matFactor * modeFactor * thickFactor))
}

// ── Advisory warnings ────────────────────────────────────────

export interface BakingWarning {
  id: string
  type:
    | 'temp_low'
    | 'temp_high'
    | 'time_mismatch'
    | 'cielo_unusual'
    | 'mode_warning'
    | 'double_bake_hint'
    | 'steam_with_pizza'
    | 'steam_too_long'
    | 'pentola_two_phase'
  severity: 'info' | 'warning'
  message: string
  category: string
  sourceNodeId?: string
  actions?: import('@commons/types/recipe-graph').WarningAction[]
}

export function getBakingWarnings(
  ovenCfg: OvenConfig,
  recipeType: string,
  recipeSubtype: string | null,
  calculatedDur: number,
  baseDur: number,
): BakingWarning[] {
  const profile = getBakingProfile(recipeType, recipeSubtype)

  // Build context for the advisory manager
  const ctx: import('./advisory-manager').AdvisoryContext = {
    nodeType: 'bake',
    nodeSubtype: null,
    nodeData: { title: '', desc: '', group: '', baseDur, restDur: 0, restTemp: null, flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [] },
    ovenCfg,
    recipeType,
    recipeSubtype,
    baseDur,
    totalFlour: 0,
    yeastPct: 0,
    saltPct: 0,
    fatPct: 0,
    hydration: 0,
    flourW: 0,
    // Baking profile computed values
    _tempMin: profile?.tempRange[0],
    _tempMax: profile?.tempRange[1],
    _suggestedTemp: profile ? Math.round((profile.tempRange[0] + profile.tempRange[1]) / 2) : undefined,
    _cieloMin: profile?.cieloPctRange[0],
    _cieloMax: profile?.cieloPctRange[1],
    _isPrecottura: profile?.isPrecottura,
    _recommendedModes: profile?.recommendedModes,
  }

  // Evaluate using the advisory manager
  const advisories = _evaluateAdvisories(ctx, _ADVISORY_RULES)

  // Convert to BakingWarning format for backward compatibility
  return advisories.map((a) => ({
    id: a.id,
    type: a.id as BakingWarning['type'],
    severity: a.severity as 'info' | 'warning',
    message: a.message,
    category: a.category,
    sourceNodeId: a.sourceNodeId,
    actions: a.actions,
  }))
}
