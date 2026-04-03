/**
 * FermentManager — Scaffold for fermentation layer logic.
 *
 * Provides per-subtype defaults from science catalogs and a warning stub.
 * Deep logic (pH curves, salt ranges, temperature profiles) will be added in future.
 */

import type { FermentMasterConfig } from '@commons/types/recipe-layers'
import type { ActionableWarning } from '@commons/types/recipe-graph'
import type { ScienceProvider } from './science/science-provider'

// ── Per-subtype defaults (hardcoded fallback, prefer ScienceProvider) ──

const FERMENT_SUBTYPE_DEFAULTS: Record<string, Partial<FermentMasterConfig>> = {
  lattofermentazione: { saltPercentage: 2.5, targetPH: 4.0, temperature: 20, duration: 72, vessel: 'jar' },
  salamoia: { saltPercentage: 5.0, targetPH: 3.8, temperature: 18, duration: 168, vessel: 'crock' },
  kombucha: { saltPercentage: 0, targetPH: 2.5, temperature: 24, duration: 168, vessel: 'jar' },
  kefir: { saltPercentage: 0, targetPH: 3.5, temperature: 22, duration: 24, vessel: 'jar' },
  miso: { saltPercentage: 10, targetPH: 4.5, temperature: 25, duration: 4320, vessel: 'crock' },
  kimchi: { saltPercentage: 3, targetPH: 3.5, temperature: 18, duration: 120, vessel: 'jar' },
}

/** Returns sensible defaults for a ferment subtype. Reads from ScienceProvider when available. */
export function getDefaults(subtype: string, provider: ScienceProvider): Partial<FermentMasterConfig> {
  if (provider) {
    const d = provider.getDefaults('ferment_subtype_defaults', subtype, null) as Record<string, unknown>
    if (d && Object.keys(d).length > 0 && d.saltPercentage != null) {
      return d as unknown as Partial<FermentMasterConfig>
    }
  }
  return FERMENT_SUBTYPE_DEFAULTS[subtype] ?? {}
}

/** Returns warnings for a ferment config. Scaffold — returns empty for now. */
export function getWarnings(_config: FermentMasterConfig, _subtype: string): ActionableWarning[] {
  return []
}
