/**
 * PrepManager — Scaffold for prep layer logic.
 *
 * Provides per-subtype defaults and a warning stub.
 * Deep logic (yield calculations, timing) will be added in future.
 */

import type { PrepMasterConfig } from '@commons/types/recipe-layers'
import type { ActionableWarning } from '@commons/types/recipe-graph'

// ── Per-subtype defaults ─────────────────────────────────────────

const PREP_SUBTYPE_DEFAULTS: Record<string, Partial<PrepMasterConfig>> = {
  topping: { servings: 4, yield: 300 },
  filling: { servings: 4, yield: 500 },
  garnish: { servings: 4, yield: 100 },
  base: { servings: 4, yield: 600 },
  marinade: { servings: 4, yield: 400 },
  generic: { servings: 4, yield: 500 },
}

/** Returns sensible defaults for a prep subtype. */
export function getDefaults(subtype: string): Partial<PrepMasterConfig> {
  return PREP_SUBTYPE_DEFAULTS[subtype] ?? {}
}

/** Returns warnings for a prep config. Scaffold — returns empty for now. */
export function getWarnings(_config: PrepMasterConfig, _subtype: string): ActionableWarning[] {
  return []
}
