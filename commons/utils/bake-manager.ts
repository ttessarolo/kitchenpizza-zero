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
import type { ScienceProvider } from './science/science-provider'
import { evaluateRules } from './science/rule-engine'
import type { RuleResult } from './science/rule-engine'

// ── Constants ────────────────────────────────────────────────────

/** Fat types suitable for frying (from provider catalog). */
export function getFryableFatKeys(provider: ScienceProvider): string[] {
  const fats = provider.getCatalog('fats') as any[]
  return fats.filter((f) => f.fryable).map((f) => f.key)
}

/** All supported cooking sub-types. */
const COOKING_SUBTYPES = ['forno', 'pentola', 'vapore', 'frittura', 'aria', 'griglia', 'padella'] as const

type CookingSubtype = (typeof COOKING_SUBTYPES)[number]

// ── 1. getBakingProfile ──────────────────────────────────────────

/**
 * Look up the best matching baking profile for a recipe type/subtype.
 * First tries exact subtype match, then falls back to type-level default (subtype: null).
 */
export function getBakingProfile(
  provider: ScienceProvider,
  recipeType: string,
  recipeSubtype: string | null,
): BakingProfile | null {
  const catalog = provider.getCatalog('baking_profiles') as unknown as BakingProfile[]
  const exact = catalog.find((p) => p.type === recipeType && p.subtype === recipeSubtype)
  if (exact) return exact
  return catalog.find((p) => p.type === recipeType && p.subtype === null) ?? null
}

// ── 2. getDefaultConfig ──────────────────────────────────────────

/**
 * Return the default CookingConfig for a given bake sub-type.
 * Reads from ScienceProvider when available, falls back to hardcoded switch.
 * Throws if the subtype is not recognized.
 */
export function getDefaultConfig(subtype: string, provider: ScienceProvider): CookingConfig {
  const d = provider.getDefaults('cooking_config_defaults', subtype, null) as Record<string, unknown>
  if (d && d.method != null && d.cfg != null) {
    return { method: d.method as string, cfg: d.cfg } as CookingConfig
  }
  throw new Error(`No cooking config defaults found for subtype: ${subtype}`)
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
  provider: ScienceProvider,
): number {
  // Look up profile — try the cooking method type first, then fall back to recipe type
  const profile =
    getBakingProfile(provider, recipeType, recipeSubtype) ??
    getBakingProfile(provider, subtype, null)

  if (!profile) {
    // No profile found; return a safe default from provider
    const fallbacks = provider.getBlock('bake_duration_fallbacks') as any
    return fallbacks?.safeDefaultDuration ?? 10
  }

  const [tMin, tMax] = profile.timeRange
  const baseTime = (tMin + tMax) / 2

  // Load cooking factors from provider, with secondary fallback from bake_duration_fallbacks
  const block = provider.getBlock('cooking_factors') as any
  const fb = provider.getBlock('bake_duration_fallbacks') as any
  const modeFactors: Record<string, number> = block?.modeFactor ?? fb?.factorFallbacks?.modeFactor ?? {}
  const steamerFactors: Record<string, number> = block?.steamerFactor ?? fb?.factorFallbacks?.steamerFactor ?? {}
  const fryMethodFactors: Record<string, number> = block?.fryMethodFactor ?? fb?.factorFallbacks?.fryMethodFactor ?? {}
  const fuelFactors: Record<string, number> = block?.fuelFactor ?? fb?.factorFallbacks?.fuelFactor ?? {}

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
export function validateConfig(subtype: string, config: CookingConfig, provider: ScienceProvider): string[] {
  const errors: string[] = []

  if (config.method !== subtype) {
    errors.push(`Config method "${config.method}" does not match subtype "${subtype}"`)
  }

  const ranges = provider.getDefaults('cooking_validation_ranges', subtype, null) as any
  if (!ranges || !ranges.tempMin) return errors  // No ranges for this subtype (e.g., forno/pentola use advisory system)

  // Generic temperature validation
  const cfg = config.cfg as any
  const tempField = subtype === 'griglia' ? 'directTemp' : (subtype === 'frittura' ? 'oilTemp' : 'temp')
  const temp = cfg?.[tempField]
  if (temp != null && (temp < ranges.tempMin || temp > ranges.tempMax)) {
    errors.push(`Temperature ${temp}${ranges.tempUnit} is outside valid range (${ranges.tempMin}-${ranges.tempMax}${ranges.tempUnit})`)
  }

  // Subtype-specific validations
  if (ranges.maxDoughWeightMin != null && cfg?.maxDoughWeight != null) {
    if (cfg.maxDoughWeight < ranges.maxDoughWeightMin || cfg.maxDoughWeight > ranges.maxDoughWeightMax) {
      errors.push(`Max dough weight ${cfg.maxDoughWeight}${ranges.maxDoughWeightUnit} is outside valid range (${ranges.maxDoughWeightMin}-${ranges.maxDoughWeightMax}${ranges.maxDoughWeightUnit})`)
    }
  }
  if (ranges.panSizeMin != null && cfg?.panSize != null) {
    if (cfg.panSize < ranges.panSizeMin || cfg.panSize > ranges.panSizeMax) {
      errors.push(`Pan size ${cfg.panSize}${ranges.panSizeUnit} is outside valid range (${ranges.panSizeMin}-${ranges.panSizeMax}${ranges.panSizeUnit})`)
    }
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
  provider: ScienceProvider,
): FatIngredient[] {
  // If user already has cooking fats configured, don't override
  if (cookingFats.length > 0) return cookingFats

  // Read frying amounts from provider
  const block = provider.getBlock('frying_amounts') as any
  const deepAmount = block?.defaults?.deep ?? 500
  const shallowAmount = block?.defaults?.shallow ?? 150

  // Auto-add a default frying fat
  const estimatedG = fryConfig.fryMethod === 'deep' ? deepAmount : shallowAmount
  const fryableKeys = getFryableFatKeys(provider)
  const defaultOil = fryableKeys[0] ?? 'olio_arachidi'

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
  const profile = getBakingProfile(provider, recipeType, recipeSubtype)

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
    ...(cookingCfg.method === 'frittura' && cookingCfg.cfg ? (() => {
      const valRanges = provider.getDefaults('cooking_validation_ranges', 'frittura', null) as any
      return {
        _oilTemp: (cookingCfg.cfg as any).oilTemp,
        _oilTempMin: valRanges?.tempMin ?? 170,
        _oilTempMax: valRanges?.tempMax ?? 195,
        _maxDoughWeight: (cookingCfg.cfg as any).maxDoughWeight,
      }
    })() : {}),
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
    const splitType = isPentola ? 'pentola' : 'forno'
    const splitConfig = provider.getDefaults('steam_split_phase_configs', splitType, null) as any

    return {
      ...r,
      actions: r.actions.map((action) => ({
        ...action,
        labelKey: splitConfig?.labelKey ?? action.labelKey,
        mutations: action.mutations.map((m) => {
          if (m.type !== 'addNodeAfter') return m
          return {
            ...m,
            subtype: splitType,
            data: {
              ...(m.data ?? {}),
              baseDur: splitConfig?.baseDur ?? (isPentola ? 12 : 10),
              title: splitConfig?.title ?? (isPentola ? 'Doratura (senza coperchio)' : 'Doratura (senza vapore)'),
              ovenCfg: splitConfig?.ovenCfg ?? (isPentola
                ? { ...((ovenCfg ?? {}) as Record<string, unknown>), lidOn: false, ovenMode: 'static' }
                : { panType: 'stone', ovenType: 'electric', ovenMode: 'static', temp: 220, cieloPct: 50, shelfPosition: 2 }),
            },
          }
        }),
      })),
    }
  })
}
