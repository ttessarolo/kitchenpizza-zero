import { describe, it, expect } from 'vitest'
import { LAYER_SUBTYPES, LAYER_SUBTYPE_VARIANTS, getDefaultSubtype, getDefaultVariant, getVariants, getSubtypeLabelKey } from '@commons/constants/layer-subtypes'
import { LAYER_TYPES } from '@commons/constants/layer-defaults'
import { getDefaultMasterConfig } from '@commons/constants/layer-defaults'
import { getLayerPalette, LAYER_PALETTES } from '@commons/constants/layer-palettes'
import { ensureLayerSubtypes } from '@commons/utils/recipe-migration'
import { getDefaults as getSauceDefaults } from '@commons/utils/sauce-manager'
import { getDefaults as getPrepDefaults } from '@commons/utils/prep-manager'
import { getDefaults as getFermentDefaults } from '@commons/utils/ferment-manager'
import { getDefaults as getPastryDefaults } from '@commons/utils/pastry-manager'
import { makeLayer, makeRecipeV3 } from './synthetic_data/helpers'
import type { RecipeV3 } from '@commons/types/recipe-layers'
import { FileScienceProvider } from '@commons/utils/science/science-provider'
import { resolve } from 'path'

const scienceDir = resolve(process.cwd(), 'science')
const i18nDir = resolve(process.cwd(), 'commons/i18n')
const provider = new FileScienceProvider(scienceDir, i18nDir)

// ── Registry integrity ──────────────────────────────────────────

describe('LAYER_SUBTYPES registry', () => {
  it('has entries for all 5 layer types', () => {
    for (const type of LAYER_TYPES) {
      expect(LAYER_SUBTYPES[type]).toBeDefined()
      expect(LAYER_SUBTYPES[type].length).toBeGreaterThan(0)
    }
  })

  it('every entry has key and labelKey', () => {
    for (const type of LAYER_TYPES) {
      for (const entry of LAYER_SUBTYPES[type]) {
        expect(entry.key).toBeTruthy()
        expect(entry.labelKey).toBeTruthy()
        expect(entry.labelKey).toContain('layer_subtype_')
      }
    }
  })

  it('has no duplicate keys within a type', () => {
    for (const type of LAYER_TYPES) {
      const keys = LAYER_SUBTYPES[type].map((e) => e.key)
      expect(new Set(keys).size).toBe(keys.length)
    }
  })
})

// ── Default subtype ─────────────────────────────────────────────

describe('getDefaultSubtype', () => {
  it('returns first entry for each type', () => {
    for (const type of LAYER_TYPES) {
      const result = getDefaultSubtype(type)
      expect(result).toBe(LAYER_SUBTYPES[type][0].key)
    }
  })
})

// ── Subtype label key ───────────────────────────────────────────

describe('getSubtypeLabelKey', () => {
  it('returns correct label key for known subtype', () => {
    expect(getSubtypeLabelKey('sauce', 'pesto')).toBe('layer_subtype_sauce_pesto')
  })

  it('returns subtype string as fallback for unknown subtype', () => {
    expect(getSubtypeLabelKey('sauce', 'unknown_type')).toBe('unknown_type')
  })
})

// ── Default master config with subtype ──────────────────────────

describe('getDefaultMasterConfig with subtype', () => {
  it('sauce: sauceType matches subtype', () => {
    const config = getDefaultMasterConfig('sauce', 'pesto')
    expect(config.type).toBe('sauce')
    if (config.type === 'sauce') {
      expect(config.config.sauceType).toBe('pesto')
    }
  })

  it('prep: prepType matches subtype', () => {
    const config = getDefaultMasterConfig('prep', 'filling')
    expect(config.type).toBe('prep')
    if (config.type === 'prep') {
      expect(config.config.prepType).toBe('filling')
    }
  })

  it('ferment: fermentType matches subtype', () => {
    const config = getDefaultMasterConfig('ferment', 'kombucha')
    expect(config.type).toBe('ferment')
    if (config.type === 'ferment') {
      expect(config.config.fermentType).toBe('kombucha')
    }
  })

  it('pastry: pastryType matches subtype', () => {
    const config = getDefaultMasterConfig('pastry', 'meringa')
    expect(config.type).toBe('pastry')
    if (config.type === 'pastry') {
      expect(config.config.pastryType).toBe('meringa')
    }
  })

  it('sauce: defaults to sugo without subtype', () => {
    const config = getDefaultMasterConfig('sauce')
    if (config.type === 'sauce') {
      expect(config.config.sauceType).toBe('sugo')
    }
  })
})

// ── Palette ─────────────────────────────────────────────────────

describe('getLayerPalette', () => {
  it('returns type-level palette for all subtypes', () => {
    for (const type of LAYER_TYPES) {
      for (const entry of LAYER_SUBTYPES[type]) {
        const palette = getLayerPalette(type, entry.key)
        expect(palette).toBe(LAYER_PALETTES[type])
      }
    }
  })
})

// ── Migration backfill ──────────────────────────────────────────

describe('ensureLayerSubtypes', () => {
  it('adds subtype to layers that lack it', () => {
    // Create a V3 recipe with layers missing subtype
    const layerWithout = makeLayer({ id: 'l1', type: 'sauce' })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (layerWithout as any).subtype
    const recipe: RecipeV3 = {
      version: 3,
      meta: { name: 'Test', author: '', type: 'pizza', subtype: 'napoletana', locale: 'it' },
      ingredientGroups: [],
      layers: [layerWithout],
      crossEdges: [],
    }

    const result = ensureLayerSubtypes(recipe)
    expect(result.layers[0].subtype).toBe('sugo') // derived from sauceType='sugo'
  })

  it('does not modify layers that already have subtype', () => {
    const recipe = makeRecipeV3([makeLayer({ id: 'l1', type: 'impasto' })])
    const result = ensureLayerSubtypes(recipe)
    expect(result).toBe(recipe) // same reference — no change
  })

  it('backfills impasto subtype from meta.type', () => {
    const layer = makeLayer({ id: 'l1', type: 'impasto' })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (layer as any).subtype
    const recipe: RecipeV3 = {
      version: 3,
      meta: { name: 'Test', author: '', type: 'focaccia', subtype: 'genovese', locale: 'it' },
      ingredientGroups: [],
      layers: [layer],
      crossEdges: [],
    }

    const result = ensureLayerSubtypes(recipe)
    expect(result.layers[0].subtype).toBe('focaccia')
  })

  it('backfills ferment subtype from fermentType', () => {
    const layer = makeLayer({ id: 'l1', type: 'ferment' })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (layer as any).subtype
    const recipe: RecipeV3 = {
      version: 3,
      meta: { name: 'Test', author: '', type: 'pane', subtype: 'pane_comune', locale: 'it' },
      ingredientGroups: [],
      layers: [layer],
      crossEdges: [],
    }

    const result = ensureLayerSubtypes(recipe)
    expect(result.layers[0].subtype).toBe('lattofermentazione')
  })
})

// ── Dummy managers ──────────────────────────────────────────────

describe('Dummy managers getDefaults', () => {
  it('sauce: returns defaults for each subtype', () => {
    for (const entry of LAYER_SUBTYPES.sauce) {
      const defaults = getSauceDefaults(entry.key, provider)
      expect(defaults).toBeDefined()
      expect(typeof defaults.targetVolume).toBe('number')
    }
  })

  it('prep: returns defaults for each subtype', () => {
    for (const entry of LAYER_SUBTYPES.prep) {
      const defaults = getPrepDefaults(entry.key, provider)
      expect(defaults).toBeDefined()
      expect(typeof defaults.servings).toBe('number')
    }
  })

  it('ferment: returns defaults for each subtype', () => {
    for (const entry of LAYER_SUBTYPES.ferment) {
      const defaults = getFermentDefaults(entry.key, provider)
      expect(defaults).toBeDefined()
      expect(typeof defaults.temperature).toBe('number')
    }
  })

  it('pastry: returns defaults for each subtype', () => {
    for (const entry of LAYER_SUBTYPES.pastry) {
      const defaults = getPastryDefaults(entry.key, provider)
      expect(defaults).toBeDefined()
      expect(typeof defaults.targetWeight).toBe('number')
    }
  })
})

// ── Layer with subtype ──────────────────────────────────────────

describe('makeLayer with subtype', () => {
  it('default subtype for impasto is pane', () => {
    const layer = makeLayer({ id: 'l1', type: 'impasto' })
    expect(layer.subtype).toBe('pane')
  })

  it('default subtype for sauce is sugo', () => {
    const layer = makeLayer({ id: 'l1', type: 'sauce' })
    expect(layer.subtype).toBe('sugo')
  })

  it('allows overriding subtype', () => {
    const layer = makeLayer({ id: 'l1', type: 'ferment', subtype: 'kimchi' })
    expect(layer.subtype).toBe('kimchi')
  })

  it('default variant for impasto is pane_comune', () => {
    const layer = makeLayer({ id: 'l1', type: 'impasto' })
    expect(layer.variant).toBe('pane_comune')
  })

  it('allows overriding variant', () => {
    const layer = makeLayer({ id: 'l1', type: 'impasto', variant: 'napoletana' })
    expect(layer.variant).toBe('napoletana')
  })
})

// ── Variant registry (second level) ─────────────────────────────

describe('LAYER_SUBTYPE_VARIANTS registry', () => {
  it('every subtype has at least one variant', () => {
    for (const type of LAYER_TYPES) {
      for (const subtype of LAYER_SUBTYPES[type]) {
        const key = `${type}:${subtype.key}`
        const variants = LAYER_SUBTYPE_VARIANTS[key]
        expect(variants, `Missing variants for ${key}`).toBeDefined()
        expect(variants.length, `Empty variants for ${key}`).toBeGreaterThan(0)
      }
    }
  })

  it('every variant has key and labelKey', () => {
    for (const [comboKey, variants] of Object.entries(LAYER_SUBTYPE_VARIANTS)) {
      for (const v of variants) {
        expect(v.key, `Missing key in ${comboKey}`).toBeTruthy()
        expect(v.labelKey, `Missing labelKey in ${comboKey}`).toBeTruthy()
      }
    }
  })

  it('no duplicate variant keys within a subtype', () => {
    for (const [comboKey, variants] of Object.entries(LAYER_SUBTYPE_VARIANTS)) {
      const keys = variants.map((v) => v.key)
      expect(new Set(keys).size, `Duplicate keys in ${comboKey}`).toBe(keys.length)
    }
  })
})

describe('getVariants / getDefaultVariant', () => {
  it('returns variants for impasto:pizza', () => {
    const variants = getVariants('impasto', 'pizza')
    expect(variants.length).toBeGreaterThan(0)
    expect(variants[0].key).toBe('napoletana')
  })

  it('returns variants for sauce:sugo', () => {
    const variants = getVariants('sauce', 'sugo')
    expect(variants.length).toBeGreaterThan(0)
  })

  it('getDefaultVariant returns first variant', () => {
    expect(getDefaultVariant('pastry', 'meringa')).toBe('francese')
    expect(getDefaultVariant('ferment', 'kimchi')).toBe('baechu')
  })

  it('returns empty for unknown combo', () => {
    const variants = getVariants('sauce', 'nonexistent')
    expect(variants).toEqual([])
    expect(getDefaultVariant('sauce', 'nonexistent')).toBe('')
  })
})

// ── Migration backfill with variant ─────────────────────────────

describe('ensureLayerSubtypes backfills variant', () => {
  it('adds variant when missing', () => {
    const layer = makeLayer({ id: 'l1', type: 'sauce' })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (layer as any).variant
    const recipe: RecipeV3 = {
      version: 3,
      meta: { name: 'Test', author: '', type: 'pizza', subtype: 'napoletana', locale: 'it' },
      ingredientGroups: [],
      layers: [layer],
      crossEdges: [],
    }
    const result = ensureLayerSubtypes(recipe)
    expect(result.layers[0].variant).toBeTruthy()
  })

  it('impasto variant backfills from meta.subtype', () => {
    const layer = makeLayer({ id: 'l1', type: 'impasto' })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (layer as any).variant
    const recipe: RecipeV3 = {
      version: 3,
      meta: { name: 'Test', author: '', type: 'pizza', subtype: 'teglia_romana', locale: 'it' },
      ingredientGroups: [],
      layers: [layer],
      crossEdges: [],
    }
    const result = ensureLayerSubtypes(recipe)
    expect(result.layers[0].variant).toBe('teglia_romana')
  })
})
