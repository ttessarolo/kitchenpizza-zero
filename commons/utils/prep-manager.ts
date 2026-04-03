/**
 * PrepManager — Scaffold for prep layer logic.
 *
 * Provides per-subtype defaults and a warning stub.
 * Deep logic (yield calculations, timing) will be added in future.
 */

import type { PrepMasterConfig } from '@commons/types/recipe-layers'
import type { ActionableWarning } from '@commons/types/recipe-graph'
import type { ScienceProvider } from './science/science-provider'

/** Returns sensible defaults for a prep subtype from ScienceProvider. */
export function getDefaults(subtype: string, provider: ScienceProvider): Partial<PrepMasterConfig> {
  const d = provider.getDefaults('prep_subtype_defaults', subtype, null) as Record<string, unknown>
  if (d && Object.keys(d).length > 0 && d.servings != null) {
    return d as unknown as Partial<PrepMasterConfig>
  }
  return {}
}

/** Returns warnings for a prep config. Scaffold — returns empty for now. */
export function getWarnings(_config: PrepMasterConfig, _subtype: string): ActionableWarning[] {
  return []
}
