/**
 * Baking utilities — backward-compatible wrapper.
 *
 * @deprecated Prefer using BakeManager directly from './bake-manager'.
 * This module delegates to BakeManager for all logic.
 */

import type { OvenConfig, CookingConfig } from '@commons/types/recipe'
import type { ActionableWarning, NodeData } from '@commons/types/recipe-graph'
import type { BakingProfile } from '../../local_data/baking-profiles'
import {
  getBakingProfile as _getBakingProfile,
  calcDuration as _calcDuration,
  getWarnings as _getWarnings,
} from './bake-manager'

// Re-export BakingProfile type for consumers
export type { BakingProfile }

/**
 * @deprecated Use BakeManager.getBakingProfile() instead.
 */
export function getBakingProfile(
  recipeType: string,
  recipeSubtype: string | null,
): BakingProfile | null {
  return _getBakingProfile(recipeType, recipeSubtype)
}

/**
 * @deprecated Use BakeManager.calcDuration() instead.
 */
export function calcBakeDuration(
  profile: BakingProfile,
  ovenCfg: OvenConfig,
  thickness: number,
): number {
  const cookingCfg: CookingConfig = { method: 'forno', cfg: ovenCfg }
  return _calcDuration('forno', cookingCfg, profile.type, profile.subtype, thickness)
}

// ── Advisory warnings (backward compat) ────────────────────────

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

/**
 * @deprecated Use BakeManager.getWarnings() instead.
 */
export function getBakingWarnings(
  ovenCfg: OvenConfig,
  recipeType: string,
  recipeSubtype: string | null,
  _calculatedDur: number,
  baseDur: number,
  method: string = 'forno',
): BakingWarning[] {
  const cookingCfg: CookingConfig = { method, cfg: ovenCfg }
  const emptyNodeData: NodeData = {
    title: '', desc: '', group: '', baseDur, restDur: 0, restTemp: null,
    flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
  }

  const advisories: ActionableWarning[] = _getWarnings(cookingCfg, recipeType, recipeSubtype, baseDur, emptyNodeData)

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
