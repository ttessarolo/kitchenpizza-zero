/**
 * BakeManager — unified cooking logic for all 7 bake sub-types.
 *
 * Sub-types: forno, pentola, vapore, frittura, aria, griglia, padella.
 *
 * Absorbs and extends the logic from baking.ts, providing:
 * - Profile lookup
 * - Default config per sub-type
 * - Duration calculation
 * - Config validation
 * - Fry oil sync with fat ingredients
 * - Warnings via Science RuleEngine (ScienceProvider)
 */

import type {
  OvenConfig,
  CookingConfig,
  FryConfig,
  FatIngredient,
  SteamerConfig,
  AirFryerConfig,
  GrillConfig,
  PanConfig,
} from '@commons/types/recipe'
import type { NodeData } from '@commons/types/recipe-graph'
import type { BakingProfile } from '../../local_data/baking-profiles'
import { BAKING_PROFILES } from '../../local_data/baking-profiles'
import { FAT_TYPES } from '../../local_data/fat-catalog'
import type { ScienceProvider } from './science/science-provider'
import { evaluateRules } from './science/rule-engine'
import type { RuleResult } from './science/rule-engine'

// ── Constants ────────────────────────────────────────────────────

/** Fat types suitable for frying (filtered from unified catalog). */
export const FRYABLE_FAT_KEYS = FAT_TYPES.filter((f) => f.fryable).map((f) => f.key)

/** All supported cooking sub-types. */
const COOKING_SUBTYPES = ['forno', 'pentola', 'vapore', 'frittura', 'aria', 'griglia', 'padella'] as const

type CookingSubtype = (typeof COOKING_SUBTYPES)[number]

// ── 1. getBakingProfile ──────────────────────────────────────────

/**
 * Look up the best matching baking profile for a recipe type/subtype.
 * First tries exact subtype match, then falls back to type-level default (subtype: null).
 */
export function getBakingProfile(
  recipeType: string,
  recipeSubtype: string | null,
): BakingProfile | null {
  const exact = BAKING_PROFILES.find(
    (p) => p.type === recipeType && p.subtype === recipeSubtype,
  )
  if (exact) return exact
  return (
    BAKING_PROFILES.find((p) => p.type === recipeType && p.subtype === null) ??
    null
  )
}

// ── 2. getDefaultConfig ──────────────────────────────────────────

/**
 * Return the default CookingConfig for a given bake sub-type.
 * Reads from ScienceProvider when available, falls back to hardcoded switch.
 * Throws if the subtype is not recognized.
 */
export function getDefaultConfig(subtype: string, provider?: ScienceProvider): CookingConfig {
  if (provider) {
    const d = provider.getDefaults('cooking_config_defaults', subtype, null) as Record<string, unknown>
    if (d && d.method != null && d.cfg != null) {
      return { method: d.method as string, cfg: d.cfg } as CookingConfig
    }
  }

  switch (subtype as CookingSubtype) {
    case 'forno':
      return {
        method: 'forno',
        cfg: {
          panType: 'stone',
          ovenType: 'electric',
          ovenMode: 'static',
          temp: 250,
          cieloPct: 50,
          shelfPosition: 2,
        },
      }

    case 'pentola':
      return {
        method: 'pentola',
        cfg: {
          panType: 'ci_lid',
          ovenType: 'electric',
          ovenMode: 'steam',
          temp: 240,
          cieloPct: 50,
          shelfPosition: 2,
          lidOn: true,
        },
      }

    case 'vapore':
      return {
        method: 'vapore',
        cfg: {
          steamerType: 'bamboo',
          temp: 100,
          lidLift: false,
          waterLevel: 'full',
          paperLiner: true,
        },
      }

    case 'frittura':
      return {
        method: 'frittura',
        cfg: {
          fryMethod: 'deep',
          oilTemp: 180,
          flipHalf: true,
          maxDoughWeight: 175,
        },
      }

    case 'aria':
      return {
        method: 'aria',
        cfg: {
          temp: 180,
          preheat: true,
          preheatDur: 3,
          oilSpray: true,
          flipHalf: true,
          basketType: 'drawer',
          capacity: 'standard',
        },
      }

    case 'griglia':
      return {
        method: 'griglia',
        cfg: {
          grillType: 'gas',
          directTemp: 400,
          indirectTemp: 200,
          twoZone: true,
          lidClosed: true,
          oilSpray: true,
          flipOnce: true,
          dockDough: false,
        },
      }

    case 'padella':
      return {
        method: 'padella',
        cfg: {
          panMaterial: 'cast_iron',
          panSize: 30,
          temp: 220,
          oilSpray: true,
          flipOnce: true,
          lidUsed: false,
        },
      }

    default:
      throw new Error(`Unknown cooking subtype: ${subtype}`)
  }
}

// ── 3. calcDuration ──────────────────────────────────────────────

/**
 * Calculate cooking duration in minutes for any bake sub-type.
 *
 * For forno/pentola: uses temperature ratio, material factor, oven mode factor, and thickness.
 * For other methods: uses method-specific adjustments on the base profile time.
 */
export function calcDuration(
  subtype: string,
  cookingCfg: CookingConfig,
  recipeType: string,
  recipeSubtype: string | null,
  thickness: number,
  provider?: ScienceProvider,
): number {
  // Look up profile — try the cooking method type first, then fall back to recipe type
  const profile =
    getBakingProfile(recipeType, recipeSubtype) ??
    getBakingProfile(subtype, null)

  if (!profile) {
    // No profile found; return a safe default
    return 10
  }

  const [tMin, tMax] = profile.timeRange
  const baseTime = (tMin + tMax) / 2

  // Load cooking factors from provider if available
  let modeFactors: Record<string, number> = { static: 1.0, fan: 0.85, steam: 1.0 }
  let steamerFactors: Record<string, number> = { bamboo: 1.0, electric: 0.9 }
  let fryMethodFactors: Record<string, number> = { deep: 1.0, shallow: 1.2 }
  let fuelFactors: Record<string, number> = { gas: 1.0, charcoal: 1.1, electric: 1.0 }
  if (provider) {
    try {
      const block = provider.getBlock('cooking_factors') as any
      if (block?.modeFactor) modeFactors = block.modeFactor
      if (block?.steamerFactor) steamerFactors = block.steamerFactor
      if (block?.fryMethodFactor) fryMethodFactors = block.fryMethodFactor
      if (block?.fuelFactor) fuelFactors = block.fuelFactor
    } catch { /* fallback to hardcoded */ }
  }

  switch (subtype as CookingSubtype) {
    // ── Oven-based methods (forno, pentola) ──
    case 'forno':
    case 'pentola': {
      const ovenCfg = cookingCfg.cfg as OvenConfig
      const tempRatio = profile.refTemp / Math.max(ovenCfg.temp, 100)
      const matFactor = profile.materialFactors[ovenCfg.panType] ?? 1.0
      const modeFactor = modeFactors[ovenCfg.ovenMode] ?? 1.0

      let thickFactor = 1.0
      if (profile.baseThickness > 0 && thickness > 0) {
        const delta = (thickness - profile.baseThickness) / 0.1
        thickFactor = 1 + delta * profile.thicknessFactor
      }

      return Math.max(1, Math.round(baseTime * tempRatio * matFactor * modeFactor * thickFactor))
    }

    // ── Steam ──
    case 'vapore': {
      const steamCfg = cookingCfg.cfg as SteamerConfig
      const steamerFactor = steamerFactors[steamCfg.steamerType] ?? 1.0
      return Math.max(1, Math.round(baseTime * steamerFactor))
    }

    // ── Frying ──
    case 'frittura': {
      const fryCfg = cookingCfg.cfg as FryConfig
      const tempRatio = profile.refTemp / Math.max(fryCfg.oilTemp, 100)
      const methodFactor = fryMethodFactors[fryCfg.fryMethod] ?? 1.0
      return Math.max(1, Math.round(baseTime * tempRatio * methodFactor))
    }

    // ── Air fryer ──
    case 'aria': {
      const airCfg = cookingCfg.cfg as AirFryerConfig
      const tempRatio = profile.refTemp / Math.max(airCfg.temp, 100)
      const preheatAdd = airCfg.preheat ? airCfg.preheatDur : 0
      return Math.max(1, Math.round(baseTime * tempRatio) + preheatAdd)
    }

    // ── Grill / BBQ ──
    case 'griglia': {
      const grillCfg = cookingCfg.cfg as GrillConfig
      const tempRatio = profile.refTemp / Math.max(grillCfg.directTemp, 100)
      const fuelFactor = fuelFactors[grillCfg.grillType] ?? 1.0
      return Math.max(1, Math.round(baseTime * tempRatio * fuelFactor))
    }

    // ── Pan / stovetop ──
    case 'padella': {
      const panCfg = cookingCfg.cfg as PanConfig
      const tempRatio = profile.refTemp / Math.max(panCfg.temp, 100)
      const matFactor = profile.materialFactors[panCfg.panMaterial] ?? 1.0
      return Math.max(1, Math.round(baseTime * tempRatio * matFactor))
    }

    default:
      return Math.max(1, Math.round(baseTime))
  }
}

// ── 4. validateConfig ────────────────────────────────────────────

/**
 * Validate a CookingConfig for a given sub-type.
 * Returns an array of error message strings (empty = valid).
 */
export function validateConfig(subtype: string, config: CookingConfig): string[] {
  const errors: string[] = []

  // Method must match subtype
  if (config.method !== subtype) {
    errors.push(`Config method "${config.method}" does not match subtype "${subtype}"`)
  }

  switch (subtype as CookingSubtype) {
    case 'forno':
    case 'pentola': {
      // Oven configs are validated by the advisory system; no additional range checks here
      break
    }

    case 'vapore': {
      const cfg = config.cfg as SteamerConfig
      if (cfg.temp < 95 || cfg.temp > 105) {
        errors.push(`Steam temperature ${cfg.temp} C is outside valid range (95-105 C)`)
      }
      break
    }

    case 'frittura': {
      const cfg = config.cfg as FryConfig
      if (cfg.oilTemp < 170 || cfg.oilTemp > 195) {
        errors.push(`Oil temperature ${cfg.oilTemp} C is outside valid range (170-195 C)`)
      }
      if (cfg.maxDoughWeight < 120 || cfg.maxDoughWeight > 200) {
        errors.push(`Max dough weight ${cfg.maxDoughWeight}g is outside valid range (120-200g)`)
      }
      break
    }

    case 'aria': {
      const cfg = config.cfg as AirFryerConfig
      if (cfg.temp < 150 || cfg.temp > 220) {
        errors.push(`Air fryer temperature ${cfg.temp} C is outside valid range (150-220 C)`)
      }
      break
    }

    case 'griglia': {
      const cfg = config.cfg as GrillConfig
      if (cfg.directTemp < 370 || cfg.directTemp > 480) {
        errors.push(`Direct grill temperature ${cfg.directTemp} C is outside valid range (370-480 C)`)
      }
      break
    }

    case 'padella': {
      const cfg = config.cfg as PanConfig
      if (cfg.temp < 180 || cfg.temp > 250) {
        errors.push(`Pan temperature ${cfg.temp} C is outside valid range (180-250 C)`)
      }
      if (cfg.panSize < 20 || cfg.panSize > 36) {
        errors.push(`Pan size ${cfg.panSize}cm is outside valid range (20-36cm)`)
      }
      break
    }

    default:
      errors.push(`Unknown cooking subtype: ${subtype}`)
  }

  return errors
}

// ── 5. syncCookingFats ───────────────────────────────────────────

/**
 * Ensure a bake node with frying method has at least one cooking fat.
 *
 * If cookingFats is empty and fryMethod is set, adds a default fryable oil.
 * Returns a new array (immutable).
 *
 * Estimated amounts: deep = 500g, shallow = 150g.
 */
export function syncCookingFats(
  cookingFats: FatIngredient[],
  fryConfig: FryConfig,
  provider?: ScienceProvider,
): FatIngredient[] {
  // If user already has cooking fats configured, don't override
  if (cookingFats.length > 0) return cookingFats

  // Read frying amounts from provider if available
  let deepAmount = 500
  let shallowAmount = 150
  if (provider) {
    try {
      const block = provider.getBlock('frying_amounts') as any
      if (block?.defaults?.deep != null) deepAmount = block.defaults.deep
      if (block?.defaults?.shallow != null) shallowAmount = block.defaults.shallow
    } catch { /* fallback to hardcoded */ }
  }

  // Auto-add a default frying fat
  const estimatedG = fryConfig.fryMethod === 'deep' ? deepAmount : shallowAmount
  const defaultOil = FRYABLE_FAT_KEYS[0] ?? 'olio_arachidi'

  return [{
    id: Date.now(),
    type: defaultOil,
    g: estimatedG,
  }]
}

// ── 6. getWarnings ───────────────────────────────────────────────

/**
 * Build context from the cooking config and evaluate Science rules.
 *
 * Supports all 7 cooking methods. For oven-based methods (forno/pentola),
 * the ovenCfg field is populated. For other methods, ovenCfg is null and
 * the cooking config is spread into the context for rule evaluation.
 *
 * Returns RuleResult[] with messageKey (never resolved text).
 */
export function getWarnings(
  provider: ScienceProvider,
  cookingCfg: CookingConfig,
  recipeType: string,
  recipeSubtype: string | null,
  baseDur: number,
  nodeData: NodeData,
): RuleResult[] {
  const profile = getBakingProfile(recipeType, recipeSubtype)

  // Extract ovenCfg for oven-based methods
  const isOvenBased = cookingCfg.method === 'forno' || cookingCfg.method === 'pentola'
  const ovenCfg = isOvenBased ? (cookingCfg.cfg as OvenConfig) : null

  const ctx: Record<string, unknown> = {
    nodeType: 'bake',
    nodeSubtype: cookingCfg.method,
    nodeData,
    ovenCfg: ovenCfg ? { ...ovenCfg, lidOn: ovenCfg.lidOn ?? true } : undefined,
    recipeType,
    recipeSubtype,
    baseDur,
    totalFlour: 0,
    yeastPct: 0,
    saltPct: 0,
    fatPct: 0,
    hydration: 0,
    flourW: 0,
    // Baking profile computed values
    _tempMin: profile?.tempRange[0],
    _tempMax: profile?.tempRange[1],
    _suggestedTemp: profile
      ? Math.round((profile.tempRange[0] + profile.tempRange[1]) / 2)
      : undefined,
    _cieloMin: profile?.cieloPctRange[0],
    _cieloMax: profile?.cieloPctRange[1],
    _isPrecottura: profile?.isPrecottura,
    _recommendedModes: profile?.recommendedModes,
    // Cooking config for non-oven rule evaluation
    _cookingMethod: cookingCfg.method,
    _cookingCfg: cookingCfg.cfg,
    // Frying-specific fields
    ...(cookingCfg.method === 'frittura' && cookingCfg.cfg ? {
      _oilTemp: (cookingCfg.cfg as any).oilTemp,
      _oilTempMin: 170,
      _oilTempMax: 195,
      _maxDoughWeight: (cookingCfg.cfg as any).maxDoughWeight,
    } : {}),
    // Grilling-specific fields
    ...(cookingCfg.method === 'griglia' && cookingCfg.cfg ? {
      _directTemp: (cookingCfg.cfg as any).directTemp,
    } : {}),
  }

  const results = evaluateRules(provider.getRules('baking'), ctx)

  // Post-process steam_too_long: adapt mutation subtype/data based on cooking method.
  // Deep clone to avoid mutating shared rule objects from the provider cache.
  return results.map((r) => {
    if (r.id !== 'steam_too_long' || !r.actions) return r

    const isPentola = cookingCfg.method === 'pentola'
    return {
      ...r,
      actions: r.actions.map((action) => ({
        ...action,
        labelKey: isPentola ? 'action.split_steam_phases_pentola' : action.labelKey,
        mutations: action.mutations.map((m) => {
          if (m.type !== 'addNodeAfter') return m
          if (isPentola) {
            return {
              ...m,
              subtype: 'pentola',
              data: {
                ...(m.data ?? {}),
                baseDur: 12,
                title: 'Doratura (senza coperchio)',
                ovenCfg: { ...((ovenCfg ?? {}) as Record<string, unknown>), lidOn: false, ovenMode: 'static' },
              },
            }
          }
          // forno: enrich with oven config for dry phase
          return {
            ...m,
            subtype: 'forno',
            data: {
              ...(m.data ?? {}),
              title: 'Doratura (senza vapore)',
              ovenCfg: { panType: 'stone', ovenType: 'electric', ovenMode: 'static', temp: 220, cieloPct: 50, shelfPosition: 2 },
            },
          }
        }),
      })),
    }
  })
}
