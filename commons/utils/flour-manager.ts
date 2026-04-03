/**
 * FlourManager — Centralized flour catalog, blending, and classification logic.
 *
 * Owns:
 * - Flour catalog lookup and filtering
 * - Weighted blending of flour properties (W, protein, P/L, absorption)
 * - Strength estimation and classification (via ScienceProvider)
 * - Search and suggestion functions
 *
 * Scientific references:
 * - [C] Casucci "La Pizza è un Arte" (2020) — Cap. 01-16 (cereali), Cap. 17-23 (reologia, W, P/L)
 * - All blending uses linear weighted average (valid for same-grain-type mixtures)
 */

import type {
  FlourCatalogEntry,
  FlourIngredient,
  BlendedFlourProps,
} from '@commons/types/recipe'
import { rnd } from './format'

// ── Science imports ────────────────────────────────────────────

import type { ScienceProvider } from './science/science-provider'
import { evaluateClassification, evaluateFormula } from './science/formula-engine'

// ── Catalog lookup ─────────────────────────────────────────────

/** Find a flour by key in the catalog, fallback to provider-configured index. */
export function getFlour(key: string, catalog: FlourCatalogEntry[], provider?: ScienceProvider): FlourCatalogEntry {
  const block = provider?.getBlock('flour_suggestion') as any
  const fallbackIdx = block?.fallbackFlourIndex ?? 5
  return catalog.find((f) => f.key === key) || catalog[fallbackIdx]
}

/** Get all flours belonging to a group ("Grano Tenero", "Grano Duro", "Speciali"). */
export function getFloursByGroup(group: string, catalog: FlourCatalogEntry[]): FlourCatalogEntry[] {
  return catalog.filter((f) => f.groupKey === group)
}

/** Search flours by query string (matches label, sub, group). Case-insensitive. */
export function searchFlours(query: string, catalog: FlourCatalogEntry[]): FlourCatalogEntry[] {
  const q = query.toLowerCase()
  return catalog.filter((f) =>
    (f.labelKey + ' ' + f.subKey + ' ' + f.groupKey).toLowerCase().includes(q),
  )
}

// ── Blending ───────────────────────────────────────────────────

/**
 * Weighted average of flour properties from a blend.
 *
 * For each property (W, protein, P/L, absorption, ash, fiber, starch damage,
 * ferment speed, falling number), computes the weighted average by flour weight (g).
 *
 * [C] Cap. 17-23 — W, P/L, and absorption blend linearly for same-grain mixtures.
 */
export function blendFlourProperties(
  provider: ScienceProvider | undefined,
  flours: FlourIngredient[],
  catalog: FlourCatalogEntry[],
): BlendedFlourProps {
  const fallbackBlock = provider?.getBlock('flour_blend_fallback') as any
  const defaultFN = fallbackBlock?.emptyBlend?.fallingNumber ?? 300

  let t = 0
  let wP = 0, wW = 0, wPL = 0, wA = 0, wAsh = 0, wFib = 0, wSD = 0, wFS = 0, wFN = 0

  for (const f of flours) {
    const c = getFlour(f.type, catalog, provider)
    t += f.g
    wP += f.g * c.protein
    wW += f.g * c.W
    wPL += f.g * c.PL
    wA += f.g * c.absorption
    wAsh += f.g * c.ash
    wFib += f.g * c.fiber
    wSD += f.g * c.starchDamage
    wFS += f.g * c.fermentSpeed
    wFN += f.g * (c.fallingNumber ?? defaultFN)
  }

  if (t <= 0) {
    if (fallbackBlock?.emptyBlend) {
      return fallbackBlock.emptyBlend as BlendedFlourProps
    }
    return {
      protein: 12, W: 280, PL: 0.55, absorption: 60, ash: 0.55,
      fiber: 2.5, starchDamage: 7, fermentSpeed: 1, fallingNumber: 300,
    }
  }

  return {
    protein: rnd(wP / t),
    W: Math.round(wW / t),
    PL: rnd((wPL / t) * 100) / 100,
    absorption: Math.round(wA / t),
    ash: rnd((wAsh / t) * 100) / 100,
    fiber: rnd((wFib / t) * 10) / 10,
    starchDamage: rnd((wSD / t) * 10) / 10,
    fermentSpeed: rnd((wFS / t) * 100) / 100,
    fallingNumber: Math.round(wFN / t),
  }
}

/**
 * Estimate blended W from flour keys using equal-weight assumption.
 * Used for UI display before the user sets gram weights.
 * For actual blends with gram weights, use blendFlourProperties().
 *
 * [C] Cap. 17-23 — W blends linearly for same-grain mixtures.
 *
 * @returns estimated W (integer), or 280 if keys is empty
 */
export function estimateBlendW(
  keys: string[],
  catalog: FlourCatalogEntry[],
  provider?: ScienceProvider,
): number {
  if (keys.length === 0) {
    const block = provider?.getBlock('flour_blend_fallback') as any
    return block?.emptyBlend?.W ?? 280
  }
  let totalW = 0
  for (const key of keys) {
    totalW += getFlour(key, catalog).W
  }
  return Math.round(totalW / keys.length)
}

/**
 * Estimate W strength from protein percentage.
 * Linear correlation for Italian soft wheat: W ≈ 22·protein - 70.
 * Clamped to [60, 420].
 *
 * [C] Cap. 20 — Relationship between protein content and alveographic W.
 */
export function estimateW(protein: number, provider: ScienceProvider): number {
  try {
    const formula = provider.getFormula('estimate_W_from_protein')
    if (formula?.expr) {
      return evaluateFormula(formula, { protein })
    }
  } catch { /* fall through to constants */ }
  const block = provider.getBlock('flour_suggestion') as any
  const est = block?.estimateW_fallback
  const slope = est?.slope ?? 22
  const intercept = est?.intercept ?? -70
  const clampMin = est?.clampMin ?? 60
  const clampMax = est?.clampMax ?? 420
  return Math.round(Math.max(clampMin, Math.min(clampMax, slope * protein + intercept)))
}

// ── Classification ─────────────────────────────────────────────

export type FlourStrength = 'weak' | 'medium' | 'strong' | 'very_strong'

/**
 * Classify flour by W strength using the ScienceProvider.
 * Reads classification from /science/ JSON.
 *
 * [C] Cap. 20 — W ranges:
 *   weak < 180, medium 180-260, strong 260-350, very_strong > 350
 */
export function classifyStrength(
  provider: ScienceProvider,
  W: number,
): string {
  return evaluateClassification(provider.getClassification('flour_strength'), { W })
}

/** Is this a whole grain flour? (fiber > 6%) */
export function isWholeGrain(flour: FlourCatalogEntry): boolean {
  return flour.fiber > 6
}

/** Is this a gluten-free flour? (W === 0 and fermentSpeed === 0) */
export function isGlutenFree(flour: FlourCatalogEntry): boolean {
  return flour.W === 0 && flour.fermentSpeed === 0
}

// ── Suggestions ────────────────────────────────────────────────

/**
 * Find flours near a target W strength, sorted by distance.
 * @param tolerance — max W distance (default 50)
 */
export function suggestForW(
  provider: ScienceProvider,
  targetW: number,
  catalog: FlourCatalogEntry[],
  tolerance?: number,
): FlourCatalogEntry[] {
  const tol = tolerance ?? ((provider.getBlock('flour_suggestion') as any)?.tolerance ?? 50)
  return catalog
    .filter((f) => Math.abs(f.W - targetW) <= tol && f.W > 0)
    .sort((a, b) => Math.abs(a.W - targetW) - Math.abs(b.W - targetW))
}

/**
 * Get flour catalog from Science provider.
 */
export function getFlourCatalog(
  provider: ScienceProvider,
): FlourCatalogEntry[] {
  return provider.getCatalog('flours') as unknown as FlourCatalogEntry[]
}
