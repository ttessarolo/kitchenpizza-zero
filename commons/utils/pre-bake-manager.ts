/**
 * PreBakeManager — manages all pre-bake logic across 9 sub-types.
 *
 * Provides default configs, validation, warnings, and suggestions
 * for pre-bake steps (boil, dock, flour_dust, oil_coat, steam_inject,
 * brush, topping, scoring, generic).
 */

import type { PreBakeConfig } from '@commons/types/recipe'
import type { ScienceProvider } from './science/science-provider'
import { evaluateRules } from './science/rule-engine'
import type { RuleResult } from './science/rule-engine'

// ── Helper: load pre-bake block ─────────────────────────────────

function getPreBakeBlock(provider: ScienceProvider): any {
  return provider.getBlock('pre_bake_configs') as any
}

// ── 1. Default config ────────────────────────────────────────────

/**
 * Returns the default PreBakeConfig for a given pre_bake sub-type.
 * Reads from ScienceProvider. Throws if the sub-type is unknown.
 */
export function getDefaultConfig(provider: ScienceProvider, subtype: string): PreBakeConfig {
  const block = getPreBakeBlock(provider)
  const cfg = block?.defaultConfigs?.[subtype]
  if (!cfg) throw new Error(`Unknown pre_bake sub-type: "${subtype}"`)
  return cfg as PreBakeConfig
}

// ── 2. Validate config ──────────────────────────────────────────

/**
 * Validates a PreBakeConfig against its sub-type constraints.
 * Returns an array of RuleResult[] from Science rules (empty if valid).
 */
export function validateConfig(
  provider: ScienceProvider,
  subtype: string,
  config: PreBakeConfig,
): RuleResult[] {
  const block = getPreBakeBlock(provider)
  const enums = block?.validEnums ?? {}
  const ranges = block?.validationRanges ?? {}

  const ctx: Record<string, unknown> = {
    subtype,
    method: config.method,
  }

  // Sub-type must be known
  const allSubtypes: string[] = enums.allSubtypes ?? []
  if (allSubtypes.length > 0 && !allSubtypes.includes(subtype)) {
    ctx.unknownSubtype = true
  }

  // Method must match sub-type
  if (config.method !== subtype) {
    ctx.methodMismatch = true
  }

  // Flatten config fields into context for rule evaluation
  if (config.cfg) {
    for (const [key, value] of Object.entries(config.cfg)) {
      ctx[key] = value
    }
  }

  // Add valid-enum flags for rule evaluation
  switch (config.method) {
    case 'boil': {
      const c = config.cfg
      const r = ranges.boil ?? {}
      ctx.liquidTempValid = c.liquidTemp >= (r.liquidTemp?.[0] ?? 85) && c.liquidTemp <= (r.liquidTemp?.[1] ?? 100)
      ctx.additivePctValid = c.additivePct >= (r.additivePct?.[0] ?? 1) && c.additivePct <= (r.additivePct?.[1] ?? 5)
      ctx.drainTimeValid = c.drainTime >= (r.drainTime?.[0] ?? 0.5) && c.drainTime <= (r.drainTime?.[1] ?? 2)
      ctx.liquidTypeValid = (enums.liquidTypes ?? []).includes(c.liquidType)
      break
    }
    case 'dock': {
      const c = config.cfg
      ctx.toolValid = (enums.dockTools ?? []).includes(c.tool)
      ctx.patternValid = (enums.dockPatterns ?? []).includes(c.pattern)
      break
    }
    case 'flour_dust': {
      const c = config.cfg
      ctx.flourTypeValid = (enums.flourTypes ?? []).includes(c.flourType)
      ctx.applicationValid = (enums.flourApplications ?? []).includes(c.application)
      break
    }
    case 'oil_coat': {
      const c = config.cfg
      ctx.oilTypeValid = (enums.oilTypes ?? []).includes(c.oilType)
      ctx.oilMethodValid = (enums.oilMethods ?? []).includes(c.method)
      ctx.surfaceValid = (enums.oilSurfaces ?? []).includes(c.surface)
      break
    }
    case 'steam_inject': {
      const c = config.cfg
      const r = ranges.steam_inject ?? {}
      ctx.removeAfterValid = c.removeAfter >= (r.removeAfter?.[0] ?? 10) && c.removeAfter <= (r.removeAfter?.[1] ?? 25)
      ctx.steamMethodValid = (enums.steamMethods ?? []).includes(c.method)
      ctx.waterVolumeValid = (enums.steamVolumes ?? []).includes(c.waterVolume)
      break
    }
    default:
      break
  }

  return evaluateRules(provider.getRules('pre_bake_validation'), ctx)
}

// ── 3. Warnings ─────────────────────────────────────────────────

/**
 * Generates advisory warnings for a pre-bake configuration.
 * Evaluates Science rules and returns RuleResult[].
 *
 * @param provider - ScienceProvider for rule lookup
 * @param preBakeCfg - The current pre-bake configuration
 * @param recipeType - Recipe type string (e.g., 'pizza', 'pane')
 * @param recipeSubtype - Recipe subtype string (e.g., 'napoletana')
 * @param nextBakeSubtype - The bake sub-type that follows this pre-bake step (or null)
 */
export function getWarnings(
  provider: ScienceProvider,
  preBakeCfg: PreBakeConfig,
  recipeType: string,
  recipeSubtype: string | null,
  nextBakeSubtype: string | null,
): RuleResult[] {
  // Build context object matching the rule conditions in pre-bake-advisories.json
  const ctx: Record<string, unknown> = {
    nodeType: 'pre_bake',
    nodeSubtype: preBakeCfg.method,
    recipeType,
    recipeSubtype,
    nextBakeSubtype,
  }

  // Flatten subtype-specific config into nodeData for rule conditions
  if (preBakeCfg.cfg) {
    const nodeData: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(preBakeCfg.cfg)) {
      nodeData[key] = value
    }
    ctx.nodeData = nodeData
  }

  // Add baseDur for boil overcook check (using drainTime as proxy)
  if (preBakeCfg.method === 'boil' && preBakeCfg.cfg) {
    ctx.baseDur = preBakeCfg.cfg.drainTime
  }

  return evaluateRules(provider.getRules('pre_bake'), ctx)
}

// ── 4. Suggestions ──────────────────────────────────────────────

/**
 * Given a bake sub-type, suggests useful pre_bake sub-types.
 * Reads from ScienceProvider. Returns an empty array if no suggestions are available.
 */
export function suggestPreBakeFor(provider: ScienceProvider, bakeSubtype: string): string[] {
  const block = getPreBakeBlock(provider)
  return block?.suggestions?.[bakeSubtype] ?? []
}
