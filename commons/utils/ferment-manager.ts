/**
 * FermentManager — Scaffold for fermentation layer logic.
 *
 * Provides per-subtype defaults from science catalogs and a warning stub.
 * Deep logic (pH curves, salt ranges, temperature profiles) will be added in future.
 */

import type { FermentMasterConfig } from '@commons/types/recipe-layers'
import type { ActionableWarning } from '@commons/types/recipe-graph'

// ── Per-subtype defaults (from science/catalogs/ferment-types.json) ──

const FERMENT_SUBTYPE_DEFAULTS: Record<string, Partial<FermentMasterConfig>> = {
  lattofermentazione: { saltPercentage: 2.5, targetPH: 4.0, temperature: 20, duration: 72, vessel: 'jar' },
  salamoia: { saltPercentage: 5.0, targetPH: 3.8, temperature: 18, duration: 168, vessel: 'crock' },
  kombucha: { saltPercentage: 0, targetPH: 2.5, temperature: 24, duration: 168, vessel: 'jar' },
  kefir: { saltPercentage: 0, targetPH: 3.5, temperature: 22, duration: 24, vessel: 'jar' },
  miso: { saltPercentage: 10, targetPH: 4.5, temperature: 25, duration: 4320, vessel: 'crock' },
  kimchi: { saltPercentage: 3, targetPH: 3.5, temperature: 18, duration: 120, vessel: 'jar' },
}

/** Returns sensible defaults for a ferment subtype. */
export function getDefaults(subtype: string): Partial<FermentMasterConfig> {
  return FERMENT_SUBTYPE_DEFAULTS[subtype] ?? {}
}

/** Returns warnings for a ferment config. Scaffold — returns empty for now. */
export function getWarnings(_config: FermentMasterConfig, _subtype: string): ActionableWarning[] {
  return []
}
