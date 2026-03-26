/**
 * PreBakeManager — manages all pre-bake logic across 9 sub-types.
 *
 * Provides default configs, validation, warnings, and suggestions
 * for pre-bake steps (boil, dock, flour_dust, oil_coat, steam_inject,
 * brush, topping, scoring, generic).
 */

import type { PreBakeConfig, BoilConfig, DockConfig, FlourDustConfig, OilCoatConfig, SteamInjectConfig } from '@commons/types/recipe'
import type { ActionableWarning } from '@commons/types/recipe-graph'

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
 * Returns an array of error messages (empty if valid).
 */
export function validateConfig(subtype: string, config: PreBakeConfig): string[] {
  const errors: string[] = []

  // Sub-type must be known
  if (!ALL_SUBTYPES.includes(subtype as typeof ALL_SUBTYPES[number])) {
    errors.push(`Unknown pre_bake sub-type: "${subtype}"`)
    return errors
  }

  // Method must match sub-type
  if (config.method !== subtype) {
    errors.push(`Sub-type "${subtype}" does not match config method "${config.method}"`)
    return errors
  }

  switch (config.method) {
    case 'boil': {
      const c = config.cfg
      if (c.liquidTemp < 85 || c.liquidTemp > 100) {
        errors.push(`liquidTemp must be 85-100, got ${c.liquidTemp}`)
      }
      if (c.additivePct < 1 || c.additivePct > 5) {
        errors.push(`additivePct must be 1-5, got ${c.additivePct}`)
      }
      if (c.drainTime < 0.5 || c.drainTime > 2) {
        errors.push(`drainTime must be 0.5-2, got ${c.drainTime}`)
      }
      if (!VALID_LIQUID_TYPES.includes(c.liquidType)) {
        errors.push(`Invalid liquidType: "${c.liquidType}"`)
      }
      break
    }
    case 'dock': {
      const c = config.cfg
      if (!VALID_DOCK_TOOLS.includes(c.tool)) {
        errors.push(`Invalid dock tool: "${c.tool}"`)
      }
      if (!VALID_DOCK_PATTERNS.includes(c.pattern)) {
        errors.push(`Invalid dock pattern: "${c.pattern}"`)
      }
      break
    }
    case 'flour_dust': {
      const c = config.cfg
      if (!VALID_FLOUR_TYPES.includes(c.flourType)) {
        errors.push(`Invalid flourType: "${c.flourType}"`)
      }
      if (!VALID_FLOUR_APPLICATIONS.includes(c.application)) {
        errors.push(`Invalid flour application: "${c.application}"`)
      }
      break
    }
    case 'oil_coat': {
      const c = config.cfg
      if (!VALID_OIL_TYPES.includes(c.oilType)) {
        errors.push(`Invalid oilType: "${c.oilType}"`)
      }
      if (!VALID_OIL_METHODS.includes(c.method)) {
        errors.push(`Invalid oil method: "${c.method}"`)
      }
      if (!VALID_OIL_SURFACES.includes(c.surface)) {
        errors.push(`Invalid oil surface: "${c.surface}"`)
      }
      break
    }
    case 'steam_inject': {
      const c = config.cfg
      if (c.removeAfter < 10 || c.removeAfter > 25) {
        errors.push(`removeAfter must be 10-25, got ${c.removeAfter}`)
      }
      if (!VALID_STEAM_METHODS.includes(c.method)) {
        errors.push(`Invalid steam method: "${c.method}"`)
      }
      if (!VALID_STEAM_VOLUMES.includes(c.waterVolume)) {
        errors.push(`Invalid waterVolume: "${c.waterVolume}"`)
      }
      break
    }
    // brush, topping, scoring, generic have cfg: null — nothing to validate
    default:
      break
  }

  return errors
}

// ── 3. Warnings ─────────────────────────────────────────────────

/**
 * Generates advisory warnings for a pre-bake configuration.
 * Checks domain-specific rules inline and returns ActionableWarning[].
 *
 * @param preBakeCfg - The current pre-bake configuration
 * @param recipeType - Recipe type string (e.g., 'pizza', 'pane')
 * @param nextBakeSubtype - The bake sub-type that follows this pre-bake step (or null)
 */
export function getWarnings(
  preBakeCfg: PreBakeConfig,
  recipeType: string,
  nextBakeSubtype: string | null,
): ActionableWarning[] {
  const warnings: ActionableWarning[] = []

  switch (preBakeCfg.method) {
    case 'boil': {
      const c = preBakeCfg.cfg

      // Lye solution safety warning
      if (c.liquidType === 'lye_solution') {
        warnings.push({
          id: 'boil_lye_safety',
          category: 'pre_bake',
          severity: 'warning',
          message: 'La soluzione di liscivia richiede guanti e ventilazione adeguata. Maneggiare con estrema cautela.',
        })
      }

      // Overcook warning when drain time exceeds 3 (using drainTime as proxy for baseDur)
      if (c.drainTime > 3) {
        warnings.push({
          id: 'boil_overcook',
          category: 'pre_bake',
          severity: 'info',
          message: 'Bollitura prolungata: rischio di sovracottura e perdita di struttura.',
        })
      }
      break
    }

    case 'dock': {
      // Docking not recommended for Neapolitan pizza
      if (recipeType === 'pizza') {
        warnings.push({
          id: 'dock_not_for_neapolitan',
          category: 'pre_bake',
          severity: 'info',
          message: 'La foratura non è consigliata per la pizza napoletana: compromette la lievitazione del cornicione.',
        })
      }
      break
    }

    case 'flour_dust': {
      const c = preBakeCfg.cfg

      // Tipo 00 burns easily
      if (c.flourType === 'tipo00') {
        warnings.push({
          id: 'flour_tipo00_burns',
          category: 'pre_bake',
          severity: 'warning',
          message: 'La farina tipo 00 brucia facilmente ad alte temperature. Preferire semola o farina di riso.',
        })
      }
      break
    }

    case 'oil_coat': {
      const c = preBakeCfg.cfg

      // EVOO not ideal for high-heat methods
      if (c.oilType === 'olive' && nextBakeSubtype && ['griglia', 'frittura'].includes(nextBakeSubtype)) {
        warnings.push({
          id: 'oil_evoo_high_heat',
          category: 'pre_bake',
          severity: 'info',
          message: "L'olio extravergine ha un punto di fumo basso. Per griglia o frittura, preferire olio di arachidi o girasole.",
        })
      }
      break
    }

    case 'steam_inject': {
      const c = preBakeCfg.cfg

      // Home oven hint for manual steam methods
      if (c.method === 'water_pan' || c.method === 'ice_cubes') {
        warnings.push({
          id: 'steam_home_oven_only',
          category: 'pre_bake',
          severity: 'info',
          message: 'Questo metodo di vapore è pensato per forni domestici. I forni professionali hanno iniezione diretta.',
        })
      }
      break
    }

    default:
      break
  }

  return warnings
}

// ── 4. Suggestions ──────────────────────────────────────────────

/**
 * Given a bake sub-type, suggests useful pre_bake sub-types.
 * Returns an empty array if no suggestions are available.
 */
export function suggestPreBakeFor(bakeSubtype: string): string[] {
  return SUGGESTIONS[bakeSubtype] ?? []
}
