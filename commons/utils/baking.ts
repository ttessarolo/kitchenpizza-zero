/**
 * Baking utilities — backward-compatible wrapper.
 *
 * @deprecated Prefer using BakeManager directly from './bake-manager'.
 * This module delegates to BakeManager for all logic.
 */

import type { OvenConfig, CookingConfig } from '@commons/types/recipe'
import type { NodeData } from '@commons/types/recipe-graph'
import type { BakingProfile } from '../../local_data/baking-profiles'
import type { ScienceProvider } from './science/science-provider'
import type { RuleResult } from './science/rule-engine'
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

/**
 * @deprecated Use BakeManager.getWarnings() instead.
 * Now returns RuleResult[] (messageKey-based, no resolved text).
 */
export function getBakingWarnings(
  provider: ScienceProvider,
  ovenCfg: OvenConfig,
  recipeType: string,
  recipeSubtype: string | null,
  _calculatedDur: number,
  baseDur: number,
  method: string = 'forno',
): RuleResult[] {
  const cookingCfg: CookingConfig = { method: method as CookingConfig['method'], cfg: ovenCfg } as CookingConfig
  const emptyNodeData: NodeData = {
    title: '', desc: '', group: '', baseDur, restDur: 0, restTemp: null,
    flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
  }

  return _getWarnings(provider, cookingCfg, recipeType, recipeSubtype, baseDur, emptyNodeData)
}
