/**
 * StaticScienceProvider — Browser-compatible ScienceProvider.
 *
 * Uses static JSON imports (bundled by Vite at build-time).
 * No fs, no path — works in both server and browser.
 */

import type {
  ScienceBlock,
  FormulaBlock,
  FactorChainBlock,
  PiecewiseBlock,
  ClassificationBlock,
  RuleBlock,
  BlendFormulaBlock,
  MultiNodeConstraintBlock,
} from './types'
import type { ScienceProvider } from './science-provider'

// ── Static imports of all science JSON files ──────────────────────
// Formulas
import yeast from '@/science/formulas/yeast.json'
import riseDuration from '@/science/formulas/rise-duration.json'
import bakeDuration from '@/science/formulas/bake-duration.json'
import composition from '@/science/formulas/composition.json'
import doughTemp from '@/science/formulas/dough-temp.json'
import yeastWCorrection from '@/science/formulas/yeast-w-correction.json'
import yeastInverse from '@/science/formulas/yeast-inverse.json'
import sauceReduction from '@/science/formulas/sauce-reduction.json'
import fermentDuration from '@/science/formulas/ferment-duration.json'

// Rules
import doughWarnings from '@/science/rules/dough-warnings.json'
import bakingAdvisories from '@/science/rules/baking-advisories.json'
import preBakeAdvisories from '@/science/rules/pre-bake-advisories.json'
import preFermentValidation from '@/science/rules/pre-ferment-validation.json'
import riseWarnings from '@/science/rules/rise-warnings.json'
import fermentationCoherence from '@/science/rules/fermentation-coherence.json'
import sauceWarnings from '@/science/rules/sauce-warnings.json'
import fermentWarnings from '@/science/rules/ferment-warnings.json'
import pastryWarnings from '@/science/rules/pastry-warnings.json'
import prepWarnings from '@/science/rules/prep-warnings.json'

// Catalogs
import flours from '@/science/catalogs/flours.json'
import fats from '@/science/catalogs/fats.json'
import bakingProfiles from '@/science/catalogs/baking-profiles.json'
import ovenConfig from '@/science/catalogs/oven-config.json'
import riseMethods from '@/science/catalogs/rise-methods.json'
import saltsSugars from '@/science/catalogs/salts-sugars.json'
import sauceTypes from '@/science/catalogs/sauce-types.json'
import fermentTypes from '@/science/catalogs/ferment-types.json'
import pastryTypes from '@/science/catalogs/pastry-types.json'

// Defaults
import doughDefaults from '@/science/defaults/dough.json'
import sauceTypeDefaults from '@/science/defaults/sauce-types.json'
import fermentTypeDefaults from '@/science/defaults/ferment-types.json'
import pastryTypeDefaults from '@/science/defaults/pastry-types.json'
import prepTypeDefaults from '@/science/defaults/prep-types.json'
import cookingConfigDefaults from '@/science/defaults/cooking-configs.json'
import fryingAmounts from '@/science/defaults/frying-amounts.json'
import cookingValidationRanges from '@/science/defaults/cooking-validation-ranges.json'
import flourBlendFallback from '@/science/defaults/flour-blend-fallback.json'
import sauceEvaporation from '@/science/defaults/sauce-evaporation.json'
import steamSplitConfigs from '@/science/defaults/steam-split-configs.json'

// Formulas (new)
import blendFlour from '@/science/formulas/blend-flour.json'

// Constraints
import fermentationCoherenceConstraint from '@/science/constraints/fermentation-coherence.json'

// Classifications
import flourStrength from '@/science/classifications/flour-strength.json'
import riseCapacity from '@/science/classifications/rise-capacity.json'
import minFermentationHours from '@/science/classifications/min-fermentation-hours.json'
import pastryTemper from '@/science/classifications/pastry-temper.json'

// ── Build indexes ─────────────────────────────────────────────────

const allFiles = [
  yeast, riseDuration, bakeDuration, composition, doughTemp, yeastWCorrection, yeastInverse,
  sauceReduction, fermentDuration,
  doughWarnings, bakingAdvisories, preBakeAdvisories, preFermentValidation, riseWarnings, fermentationCoherence,
  sauceWarnings, fermentWarnings, pastryWarnings, prepWarnings,
  flours, fats, bakingProfiles, ovenConfig, riseMethods, saltsSugars,
  sauceTypes, fermentTypes, pastryTypes,
  doughDefaults, sauceTypeDefaults, fermentTypeDefaults, pastryTypeDefaults, prepTypeDefaults,
  cookingConfigDefaults, fryingAmounts, cookingValidationRanges, flourBlendFallback,
  sauceEvaporation, steamSplitConfigs,
  blendFlour,
  fermentationCoherenceConstraint,
  flourStrength, riseCapacity, minFermentationHours,
  pastryTemper,
]

const blocks = new Map<string, ScienceBlock>()
const rulesByDomain = new Map<string, RuleBlock[]>()
const catalogs = new Map<string, Record<string, unknown>[]>()

function indexBlocks(raw: unknown) {
  const items: ScienceBlock[] = Array.isArray(raw) ? raw : [raw as ScienceBlock]
  for (const block of items) {
    blocks.set(block.id, block)

    if (block.type === 'rule') {
      const domain = (block as any)._meta?.section ?? (block as any).category
      if (!rulesByDomain.has(domain)) rulesByDomain.set(domain, [])
      rulesByDomain.get(domain)!.push(block as RuleBlock)
    }

    if (block.type === 'catalog') {
      catalogs.set(block.id, (block as any).entries)
    }
  }
}

for (const file of allFiles) {
  indexBlocks(file)
}


// ── Provider implementation ───────────────────────────────────────

export const staticProvider: ScienceProvider = {
  getFormula(id: string): FormulaBlock {
    const b = blocks.get(id)
    if (!b || b.type !== 'formula') throw new Error(`Formula "${id}" not found`)
    return b as FormulaBlock
  },

  getFactorChain(id: string): FactorChainBlock {
    const b = blocks.get(id)
    if (!b || b.type !== 'factor_chain') throw new Error(`Factor chain "${id}" not found`)
    return b as FactorChainBlock
  },

  getPiecewise(id: string): PiecewiseBlock {
    const b = blocks.get(id)
    if (!b || b.type !== 'piecewise') throw new Error(`Piecewise "${id}" not found`)
    return b as PiecewiseBlock
  },

  getRules(domain: string): RuleBlock[] {
    if (domain === '*') {
      const all: RuleBlock[] = []
      for (const rules of rulesByDomain.values()) all.push(...rules)
      return all
    }
    return rulesByDomain.get(domain) ?? []
  },

  getClassification(id: string): ClassificationBlock {
    const b = blocks.get(id)
    if (!b || b.type !== 'classification') throw new Error(`Classification "${id}" not found`)
    return b as ClassificationBlock
  },

  getBlendFormula(id: string): BlendFormulaBlock {
    const b = blocks.get(id)
    if (!b || b.type !== 'blend_formula') throw new Error(`Blend formula "${id}" not found`)
    return b as BlendFormulaBlock
  },

  getMultiNodeConstraint(id: string): MultiNodeConstraintBlock {
    const b = blocks.get(id)
    if (!b || b.type !== 'multi_node_constraint') throw new Error(`Multi-node constraint "${id}" not found`)
    return b as MultiNodeConstraintBlock
  },

  getCatalog(name: string): Record<string, unknown>[] {
    return catalogs.get(name) ?? []
  },

  getDefaults(id: string, type: string, subtype: string | null): Record<string, unknown> {
    const b = blocks.get(id)
    if (!b || b.type !== 'defaults') return {}
    const entries = (b as any).entries as Record<string, unknown>[]
    const exact = entries.find((e: any) => e.type === type && e.subtype === subtype)
    if (exact) return exact
    const typeLevel = entries.find((e: any) => e.type === type && (e.subtype === null || e.subtype === undefined))
    if (typeLevel) return typeLevel
    return entries[entries.length - 1] ?? {}
  },

  // Admin APIs — not available in static provider (read-only)
  listAll(): ScienceBlock[] {
    return Array.from(blocks.values())
  },

  getBlock(id: string): ScienceBlock | null {
    return blocks.get(id) ?? null
  },

  saveBlock(): void {
    throw new Error('StaticScienceProvider is read-only')
  },

  getI18nKeys(): Record<string, string> {
    return {} // i18n is handled by useT(), not by the provider in browser
  },

  saveI18nKey(): void {
    throw new Error('StaticScienceProvider is read-only')
  },
}
