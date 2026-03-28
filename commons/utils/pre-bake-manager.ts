/**
 * PreBakeManager — manages all pre-bake logic across 9 sub-types.
 *
 * Provides default configs, validation, warnings, and suggestions
 * for pre-bake steps (boil, dock, flour_dust, oil_coat, steam_inject,
 * brush, topping, scoring, generic).
 */

import type { PreBakeConfig, BoilConfig, DockConfig, FlourDustConfig, OilCoatConfig, SteamInjectConfig } from '@commons/types/recipe'
import type { ScienceProvider } from './science/science-provider'
import { evaluateRules } from './science/rule-engine'
import type { RuleResult } from './science/rule-engine'

// ── Valid enum values ────────────────────────────────────────────

const VALID_LIQUID_TYPES: BoilConfig['liquidType'][] = ['water_malt', 'water_honey', 'water_sugar', 'lye_solution', 'baking_soda']
const VALID_DOCK_TOOLS: DockConfig['tool'][] = ['fork', 'docker_roller', 'skewer']
const VALID_DOCK_PATTERNS: DockConfig['pattern'][] = ['uniform', 'center_only', 'edge_sparing']
const VALID_FLOUR_TYPES: FlourDustConfig['flourType'][] = ['rice', 'semolina', 'tipo00', 'rye', 'cornmeal']
const VALID_FLOUR_APPLICATIONS: FlourDustConfig['application'][] = ['surface', 'base_only', 'all_over']
const VALID_OIL_TYPES: OilCoatConfig['oilType'][] = ['olive', 'canola', 'peanut', 'sunflower', 'avocado']
const VALID_OIL_METHODS: OilCoatConfig['method'][] = ['spray', 'brush', 'drizzle']
const VALID_OIL_SURFACES: OilCoatConfig['surface'][] = ['top', 'bottom', 'both']
const VALID_STEAM_METHODS: SteamInjectConfig['method'][] = ['water_pan', 'ice_cubes', 'spray_bottle', 'steam_injection']
const VALID_STEAM_VOLUMES: SteamInjectConfig['waterVolume'][] = ['small', 'medium', 'large']

const ALL_SUBTYPES = ['boil', 'dock', 'flour_dust', 'oil_coat', 'steam_inject', 'brush', 'topping', 'scoring', 'generic'] as const

// ── Suggestions map ──────────────────────────────────────────────

const SUGGESTIONS: Record<string, string[]> = {
  griglia: ['dock', 'oil_coat'],
  padella: ['oil_coat'],
  aria: ['oil_coat'],
  frittura: [],
  vapore: [],
  forno: ['scoring', 'steam_inject', 'flour_dust'],
  pentola: ['scoring', 'flour_dust'],
}

// ── 1. Default config ────────────────────────────────────────────

/**
 * Returns the default PreBakeConfig for a given pre_bake sub-type.
 * Throws if the sub-type is unknown.
 */
export function getDefaultConfig(subtype: string): PreBakeConfig {
  switch (subtype) {
    case 'boil':
      return {
        method: 'boil',
        cfg: { liquidType: 'water_malt', liquidTemp: 100, additivePct: 2, flipOnce: true, drainTime: 1 },
      }
    case 'dock':
      return {
        method: 'dock',
        cfg: { tool: 'fork', pattern: 'uniform' },
      }
    case 'flour_dust':
      return {
        method: 'flour_dust',
        cfg: { flourType: 'rice', application: 'surface' },
      }
    case 'oil_coat':
      return {
        method: 'oil_coat',
        cfg: { oilType: 'olive', method: 'spray', surface: 'both' },
      }
    case 'steam_inject':
      return {
        method: 'steam_inject',
        cfg: { method: 'water_pan', waterVolume: 'small', removeAfter: 15 },
      }
    case 'brush':
      return { method: 'brush', cfg: null }
    case 'topping':
      return { method: 'topping', cfg: null }
    case 'scoring':
      return { method: 'scoring', cfg: null }
    case 'generic':
      return { method: 'generic', cfg: null }
    default:
      throw new Error(`Unknown pre_bake sub-type: "${subtype}"`)
  }
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
  const ctx: Record<string, unknown> = {
    subtype,
    method: config.method,
  }

  // Sub-type must be known
  if (!ALL_SUBTYPES.includes(subtype as typeof ALL_SUBTYPES[number])) {
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
      ctx.liquidTempValid = c.liquidTemp >= 85 && c.liquidTemp <= 100
      ctx.additivePctValid = c.additivePct >= 1 && c.additivePct <= 5
      ctx.drainTimeValid = c.drainTime >= 0.5 && c.drainTime <= 2
      ctx.liquidTypeValid = VALID_LIQUID_TYPES.includes(c.liquidType)
      break
    }
    case 'dock': {
      const c = config.cfg
      ctx.toolValid = VALID_DOCK_TOOLS.includes(c.tool)
      ctx.patternValid = VALID_DOCK_PATTERNS.includes(c.pattern)
      break
    }
    case 'flour_dust': {
      const c = config.cfg
      ctx.flourTypeValid = VALID_FLOUR_TYPES.includes(c.flourType)
      ctx.applicationValid = VALID_FLOUR_APPLICATIONS.includes(c.application)
      break
    }
    case 'oil_coat': {
      const c = config.cfg
      ctx.oilTypeValid = VALID_OIL_TYPES.includes(c.oilType)
      ctx.oilMethodValid = VALID_OIL_METHODS.includes(c.method)
      ctx.surfaceValid = VALID_OIL_SURFACES.includes(c.surface)
      break
    }
    case 'steam_inject': {
      const c = config.cfg
      ctx.removeAfterValid = c.removeAfter >= 10 && c.removeAfter <= 25
      ctx.steamMethodValid = VALID_STEAM_METHODS.includes(c.method)
      ctx.waterVolumeValid = VALID_STEAM_VOLUMES.includes(c.waterVolume)
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
 * Returns an empty array if no suggestions are available.
 */
export function suggestPreBakeFor(bakeSubtype: string): string[] {
  return SUGGESTIONS[bakeSubtype] ?? []
}
