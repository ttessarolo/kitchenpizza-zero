/**
 * PrepManager — Scaffold for prep layer logic.
 *
 * Provides per-subtype defaults and a warning stub.
 * Deep logic (yield calculations, timing) will be added in future.
 */

import type { PrepMasterConfig } from '@commons/types/recipe-layers'
import type { ActionableWarning } from '@commons/types/recipe-graph'
import type { ScienceProvider } from './science/science-provider'

// ── Per-subtype defaults (hardcoded fallback, prefer ScienceProvider) ──

const PREP_SUBTYPE_DEFAULTS: Record<string, Partial<PrepMasterConfig>> = {
  topping: { servings: 4, yield: 300 },
  filling: { servings: 4, yield: 500 },
  garnish: { servings: 4, yield: 100 },
  base: { servings: 4, yield: 600 },
  marinade: { servings: 4, yield: 400 },
  generic: { servings: 4, yield: 500 },
}

/** Returns sensible defaults for a prep subtype. Reads from ScienceProvider when available. */
export function getDefaults(subtype: string, provider?: ScienceProvider): Partial<PrepMasterConfig> {
  if (provider) {
    const d = provider.getDefaults('prep_subtype_defaults', subtype, null) as Record<string, unknown>
    if (d && Object.keys(d).length > 0 && d.servings != null) {
      return d as unknown as Partial<PrepMasterConfig>
    }
  }
  return PREP_SUBTYPE_DEFAULTS[subtype] ?? {}
}

/** Returns warnings for a prep config. Scaffold — returns empty for now. */
export function getWarnings(_config: PrepMasterConfig, _subtype: string): ActionableWarning[] {
  return []
}
