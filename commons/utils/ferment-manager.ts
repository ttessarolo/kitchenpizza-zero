/**
 * FermentManager — Scaffold for fermentation layer logic.
 *
 * Provides per-subtype defaults from science catalogs and a warning stub.
 * Deep logic (pH curves, salt ranges, temperature profiles) will be added in future.
 */

import type { FermentMasterConfig } from '@commons/types/recipe-layers'
import type { ActionableWarning } from '@commons/types/recipe-graph'
import type { ScienceProvider } from './science/science-provider'

/** Returns sensible defaults for a ferment subtype from ScienceProvider. */
export function getDefaults(subtype: string, provider: ScienceProvider): Partial<FermentMasterConfig> {
  const d = provider.getDefaults('ferment_subtype_defaults', subtype, null) as Record<string, unknown>
  if (d && Object.keys(d).length > 0 && d.saltPercentage != null) {
    return d as unknown as Partial<FermentMasterConfig>
  }
  return {}
}

/** Returns warnings for a ferment config. Scaffold — returns empty for now. */
export function getWarnings(_config: FermentMasterConfig, _subtype: string): ActionableWarning[] {
  return []
}
