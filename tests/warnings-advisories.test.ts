/**
 * Comprehensive test suite for ALL warnings and advisories
 * in the CookingScienceBrain system.
 *
 * Covers: baking, pre-bake, pre-ferment, rise, dough, reconciler,
 * action execution, exclusions, and suppression.
 */
import { describe, it, expect } from 'vitest'
import { resolve } from 'path'
import { FileScienceProvider } from '@commons/utils/science/science-provider'
import { getWarnings as getBakeWarnings } from '@commons/utils/bake-manager'
import { getWarnings as getPreBakeWarnings, validateConfig as validatePreBakeConfig } from '@commons/utils/pre-bake-manager'
import { validatePreFerment } from '@commons/utils/pre-ferment-manager'
import { getRiseWarnings } from '@commons/utils/rise-manager'
import { getDoughWarnings } from '@commons/utils/dough-manager'
import { reconcileGraph } from '~/server/services/graph-reconciler.service'
import { toActionableWarnings, evaluateRules } from '@commons/utils/science/rule-engine'
import { makeNode, makeEdge, makeGraph, makePfCfg } from './synthetic_data/helpers'
import type { CookingConfig, OvenConfig, PreBakeConfig, Portioning, RecipeMeta, PreFermentConfig } from '@commons/types/recipe'
import type { NodeData, RecipeGraph } from '@commons/types/recipe-graph'

// ── Provider setup ─────────────────────────────────────────────────

const scienceDir = resolve(process.cwd(), 'science')
const i18nDir = resolve(process.cwd(), 'commons/i18n')
const provider = new FileScienceProvider(scienceDir, i18nDir)

// ── Shared fixtures ────────────────────────────────────────────────

const emptyNodeData: NodeData = {
  title: 'test', desc: '', group: 'Impasto', baseDur: 10, restDur: 0, restTemp: null,
  flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
}

const defaultPortioning: Portioning = {
  mode: 'ball', tray: { preset: 't', l: 40, w: 30, h: 2, material: 'alu', griglia: false, count: 1 },
  ball: { weight: 250, count: 4 }, thickness: 0.5, targetHyd: 65,
  doughHours: 18, yeastPct: 0.22, saltPct: 2.3, fatPct: 3,
  preImpasto: null, preFermento: null,
}

const defaultMeta: RecipeMeta = { name: 'Test', author: '', type: 'pane', subtype: 'pane_comune', locale: 'it' }

function makeCookingCfg(method: string, cfg: Record<string, unknown>): CookingConfig {
  return { method, cfg } as unknown as CookingConfig
}

function makeOvenCfg(overrides: Partial<OvenConfig> = {}): OvenConfig {
  return {
    panType: 'stone', ovenType: 'electric', ovenMode: 'static',
    temp: 250, cieloPct: 50, shelfPosition: 2,
    ...overrides,
  }
}

// ═══════════════════════════════════════════════════════════════
// 1. BAKING — Temperature
// ═══════════════════════════════════════════════════════════════

describe('Baking advisories — Temperature', () => {
  // pizza napoletana tempRange = [280, 350]
  it('temp_low fires when temperature is below profile minimum (pizza napoletana)', () => {
    const cfg = makeCookingCfg('forno', makeOvenCfg({ temp: 200 }))
    const warnings = getBakeWarnings(provider, cfg, 'pizza', 'napoletana', 3, emptyNodeData)
    const w = warnings.find((w) => w.id === 'temp_low')
    expect(w).toBeDefined()
    expect(w!.severity).toBe('warning')
    expect(w!.messageKey).toBe('advisory.temp_low')
  })

  it('temp_high fires when temperature is above profile maximum (pizza napoletana)', () => {
    const cfg = makeCookingCfg('forno', makeOvenCfg({ temp: 450 }))
    const warnings = getBakeWarnings(provider, cfg, 'pizza', 'napoletana', 3, emptyNodeData)
    const w = warnings.find((w) => w.id === 'temp_high')
    expect(w).toBeDefined()
    expect(w!.severity).toBe('warning')
    expect(w!.messageKey).toBe('advisory.temp_high')
  })

  it('no temp warnings when temperature is within range (pizza napoletana)', () => {
    const cfg = makeCookingCfg('forno', makeOvenCfg({ temp: 320 }))
    const warnings = getBakeWarnings(provider, cfg, 'pizza', 'napoletana', 3, emptyNodeData)
    expect(warnings.find((w) => w.id === 'temp_low')).toBeUndefined()
    expect(warnings.find((w) => w.id === 'temp_high')).toBeUndefined()
  })

  // pane_comune tempRange = [190, 230]
  it('temp_high fires for pane_comune with temp above 230', () => {
    const cfg = makeCookingCfg('forno', makeOvenCfg({ temp: 280 }))
    const warnings = getBakeWarnings(provider, cfg, 'pane', 'pane_comune', 35, emptyNodeData)
    const w = warnings.find((w) => w.id === 'temp_high')
    expect(w).toBeDefined()
  })
})

// ═══════════════════════════════════════════════════════════════
// 2. BAKING — Cielo/Platea
// ═══════════════════════════════════════════════════════════════

describe('Baking advisories — Cielo/Platea', () => {
  // napoletana cieloPctRange = [40, 60]
  it('cielo_too_low fires when cieloPct is below minimum', () => {
    const cfg = makeCookingCfg('forno', makeOvenCfg({ temp: 300, cieloPct: 15 }))
    const warnings = getBakeWarnings(provider, cfg, 'pizza', 'napoletana', 3, emptyNodeData)
    const w = warnings.find((w) => w.id === 'cielo_too_low')
    expect(w).toBeDefined()
    expect(w!.severity).toBe('info')
  })

  it('cielo_too_high fires when cieloPct is above maximum', () => {
    const cfg = makeCookingCfg('forno', makeOvenCfg({ temp: 300, cieloPct: 85 }))
    const warnings = getBakeWarnings(provider, cfg, 'pizza', 'napoletana', 3, emptyNodeData)
    const w = warnings.find((w) => w.id === 'cielo_too_high')
    expect(w).toBeDefined()
    expect(w!.severity).toBe('info')
  })
})

// ═══════════════════════════════════════════════════════════════
// 3. BAKING — Oven Mode
// ═══════════════════════════════════════════════════════════════

describe('Baking advisories — Oven Mode', () => {
  it('mode_not_recommended fires when ovenMode is fan', () => {
    const cfg = makeCookingCfg('forno', makeOvenCfg({ temp: 300, ovenMode: 'fan' }))
    const warnings = getBakeWarnings(provider, cfg, 'pizza', 'napoletana', 3, emptyNodeData)
    const w = warnings.find((w) => w.id === 'mode_not_recommended')
    expect(w).toBeDefined()
    expect(w!.severity).toBe('info')
  })

  it('mode_not_recommended excluded for dolce (fan is recommended)', () => {
    const cfg = makeCookingCfg('forno', makeOvenCfg({ temp: 180, ovenMode: 'fan' }))
    const warnings = getBakeWarnings(provider, cfg, 'dolce', 'brioche', 18, emptyNodeData)
    const w = warnings.find((w) => w.id === 'mode_not_recommended')
    expect(w).toBeUndefined()
  })
})

// ═══════════════════════════════════════════════════════════════
// 4. BAKING — Steam & Pentola
// ═══════════════════════════════════════════════════════════════

describe('Baking advisories — Steam & Pentola', () => {
  it('steam_with_pizza fires when ovenMode is steam and recipeType is pizza', () => {
    const cfg = makeCookingCfg('forno', makeOvenCfg({ temp: 300, ovenMode: 'steam' }))
    const warnings = getBakeWarnings(provider, cfg, 'pizza', 'napoletana', 3, emptyNodeData)
    const w = warnings.find((w) => w.id === 'steam_with_pizza')
    expect(w).toBeDefined()
    expect(w!.severity).toBe('warning')
  })

  it('pentola_no_lid fires when pentola lid is off (non-pizza)', () => {
    const cfg = makeCookingCfg('pentola', makeOvenCfg({ temp: 240, ovenMode: 'static', lidOn: false }))
    const warnings = getBakeWarnings(provider, cfg, 'pane', 'pane_comune', 25, emptyNodeData)
    const w = warnings.find((w) => w.id === 'pentola_no_lid')
    expect(w).toBeDefined()
    expect(w!.severity).toBe('warning')
  })

  it('pentola_two_phase suppressed by steam_too_long when both conditions met', () => {
    const cfg = makeCookingCfg('pentola', makeOvenCfg({ temp: 240, ovenMode: 'steam', lidOn: true }))
    const warnings = getBakeWarnings(provider, cfg, 'pane', 'pane_comune', 35, emptyNodeData)
    // steam_too_long fires (baseDur > 30, ovenMode steam)
    expect(warnings.find((w) => w.id === 'steam_too_long')).toBeDefined()
    // pentola_two_phase is suppressed by steam_too_long
    expect(warnings.find((w) => w.id === 'pentola_two_phase')).toBeUndefined()
  })

  it('steam_too_long fires when baseDur > 30 and ovenMode is steam', () => {
    const cfg = makeCookingCfg('forno', makeOvenCfg({ temp: 220, ovenMode: 'steam' }))
    const warnings = getBakeWarnings(provider, cfg, 'pane', 'pane_comune', 40, emptyNodeData)
    const w = warnings.find((w) => w.id === 'steam_too_long')
    expect(w).toBeDefined()
    expect(w!.severity).toBe('info')
    expect(w!.actions).toBeDefined()
    expect(w!.actions!.length).toBeGreaterThan(0)
  })
})

// ═══════════════════════════════════════════════════════════════
// 5. BAKING — Frying
// ═══════════════════════════════════════════════════════════════

describe('Baking advisories — Frying', () => {
  it('fry_oil_temp_low fires when oilTemp < 170', () => {
    const cfg = makeCookingCfg('frittura', { fryMethod: 'deep', oilTemp: 160, flipHalf: true, maxDoughWeight: 175 })
    const warnings = getBakeWarnings(provider, cfg, 'pizza', 'napoletana', 5, emptyNodeData)
    const w = warnings.find((w) => w.id === 'fry_oil_temp_low')
    expect(w).toBeDefined()
    expect(w!.severity).toBe('warning')
  })

  it('fry_oil_temp_high fires when oilTemp > 195', () => {
    const cfg = makeCookingCfg('frittura', { fryMethod: 'deep', oilTemp: 200, flipHalf: true, maxDoughWeight: 175 })
    const warnings = getBakeWarnings(provider, cfg, 'pizza', 'napoletana', 5, emptyNodeData)
    const w = warnings.find((w) => w.id === 'fry_oil_temp_high')
    expect(w).toBeDefined()
    expect(w!.severity).toBe('warning')
  })

  it('fry_finish_suggest fires for frittura + pizza', () => {
    const cfg = makeCookingCfg('frittura', { fryMethod: 'deep', oilTemp: 180, flipHalf: true, maxDoughWeight: 175 })
    const warnings = getBakeWarnings(provider, cfg, 'pizza', 'napoletana', 5, emptyNodeData)
    const w = warnings.find((w) => w.id === 'fry_finish_suggest')
    expect(w).toBeDefined()
    expect(w!.actions).toBeDefined()
    expect(w!.actions![0].labelKey).toBe('action.add_oven_finish')
  })

  it('fry_dough_too_heavy fires when nodeData.totalWeight exists', () => {
    const nodeData: NodeData = { ...emptyNodeData, totalWeight: 300 } as NodeData & { totalWeight: number }
    const cfg = makeCookingCfg('frittura', { fryMethod: 'deep', oilTemp: 180, flipHalf: true, maxDoughWeight: 175 })
    const warnings = getBakeWarnings(provider, cfg, 'pane', 'pane_comune', 5, nodeData)
    const w = warnings.find((w) => w.id === 'fry_dough_too_heavy')
    expect(w).toBeDefined()
  })
})

// ═══════════════════════════════════════════════════════════════
// 6. BAKING — Grilling
// ═══════════════════════════════════════════════════════════════

describe('Baking advisories — Grilling', () => {
  it('grill_flareup fires for griglia method', () => {
    const cfg = makeCookingCfg('griglia', {
      grillType: 'gas', directTemp: 400, indirectTemp: 200,
      twoZone: true, lidClosed: true, oilSpray: true, flipOnce: true, dockDough: false,
    })
    const warnings = getBakeWarnings(provider, cfg, 'pane', 'pane_comune', 10, emptyNodeData)
    const w = warnings.find((w) => w.id === 'grill_flareup')
    expect(w).toBeDefined()
    expect(w!.severity).toBe('info')
  })

  it('grill_dock_hint fires for griglia + pizza', () => {
    const cfg = makeCookingCfg('griglia', {
      grillType: 'gas', directTemp: 400, indirectTemp: 200,
      twoZone: true, lidClosed: true, oilSpray: true, flipOnce: true, dockDough: false,
    })
    const warnings = getBakeWarnings(provider, cfg, 'pizza', 'napoletana', 5, emptyNodeData)
    const w = warnings.find((w) => w.id === 'grill_dock_hint')
    expect(w).toBeDefined()
  })
})

// ═══════════════════════════════════════════════════════════════
// 7. BAKING — Air Fryer
// ═══════════════════════════════════════════════════════════════

describe('Baking advisories — Air Fryer', () => {
  it('airfry_large_pizza fires for aria + pizza', () => {
    const cfg = makeCookingCfg('aria', {
      temp: 180, preheat: true, preheatDur: 3, oilSpray: true,
      flipHalf: true, basketType: 'drawer', capacity: 'standard',
    })
    const warnings = getBakeWarnings(provider, cfg, 'pizza', 'napoletana', 10, emptyNodeData)
    const w = warnings.find((w) => w.id === 'airfry_large_pizza')
    expect(w).toBeDefined()
  })

  it('airfry_flip_reminder fires for aria method', () => {
    const cfg = makeCookingCfg('aria', {
      temp: 180, preheat: true, preheatDur: 3, oilSpray: true,
      flipHalf: true, basketType: 'drawer', capacity: 'standard',
    })
    const warnings = getBakeWarnings(provider, cfg, 'pane', 'pane_comune', 15, emptyNodeData)
    const w = warnings.find((w) => w.id === 'airfry_flip_reminder')
    expect(w).toBeDefined()
  })
})

// ═══════════════════════════════════════════════════════════════
// 8. BAKING — Steamer
// ═══════════════════════════════════════════════════════════════

describe('Baking advisories — Steamer', () => {
  it('steamer_water_low fires when baseDur > 15 for vapore', () => {
    const cfg = makeCookingCfg('vapore', {
      steamerType: 'bamboo', temp: 100, waterLevel: 'full', paperLiner: false, lidLift: false,
    })
    const warnings = getBakeWarnings(provider, cfg, 'pane', 'pane_comune', 20, emptyNodeData)
    const w = warnings.find((w) => w.id === 'steamer_water_low')
    expect(w).toBeDefined()
    expect(w!.severity).toBe('info')
  })

  it('steamer_lid_condensation fires for vapore method', () => {
    const cfg = makeCookingCfg('vapore', {
      steamerType: 'bamboo', temp: 100, waterLevel: 'full', paperLiner: false, lidLift: false,
    })
    const warnings = getBakeWarnings(provider, cfg, 'pane', 'pane_comune', 10, emptyNodeData)
    const w = warnings.find((w) => w.id === 'steamer_lid_condensation')
    expect(w).toBeDefined()
  })
})

// ═══════════════════════════════════════════════════════════════
// 9. BAKING — Pan
// ═══════════════════════════════════════════════════════════════

describe('Baking advisories — Pan', () => {
  it('pan_cast_iron_preheat fires for padella method', () => {
    const cfg = makeCookingCfg('padella', {
      panMaterial: 'cast_iron', panSize: 28, temp: 220,
      oilSpray: true, flipOnce: true, lidUsed: false,
    })
    const warnings = getBakeWarnings(provider, cfg, 'pane', 'pane_comune', 15, emptyNodeData)
    const w = warnings.find((w) => w.id === 'pan_cast_iron_preheat')
    expect(w).toBeDefined()
    expect(w!.severity).toBe('info')
  })

  it('pan_finish_suggest fires for padella + pizza', () => {
    const cfg = makeCookingCfg('padella', {
      panMaterial: 'cast_iron', panSize: 28, temp: 220,
      oilSpray: true, flipOnce: true, lidUsed: false,
    })
    const warnings = getBakeWarnings(provider, cfg, 'pizza', 'napoletana', 5, emptyNodeData)
    const w = warnings.find((w) => w.id === 'pan_finish_suggest')
    expect(w).toBeDefined()
    expect(w!.actions).toBeDefined()
    expect(w!.actions![0].labelKey).toBe('action.add_grill_finish')
  })
})

// ═══════════════════════════════════════════════════════════════
// 10. BAKING — Flour W
// ═══════════════════════════════════════════════════════════════

describe('Baking advisories — Flour W', () => {
  it('flour_w_too_weak fires when flourW < 220', () => {
    const cfg = makeCookingCfg('forno', makeOvenCfg({ temp: 300 }))
    const nodeData: NodeData = { ...emptyNodeData }
    const warnings = getBakeWarnings(provider, cfg, 'pizza', 'napoletana', 3, nodeData)
    // getBakeWarnings sets flourW=0 by default, and the rule requires flourW > 0 AND flourW < 220
    // We need to test via the rule engine directly since getBakeWarnings hardcodes flourW=0
    const rules = provider.getRules('baking')
    const ctx: Record<string, unknown> = { flourW: 150, nodeType: 'bake' }
    const results = evaluateRules(rules, ctx)
    const w = results.find((r) => r.id === 'flour_w_too_weak')
    expect(w).toBeDefined()
    expect(w!.severity).toBe('warning')
  })

  it('flour_w_too_weak does NOT fire when flourW >= 220', () => {
    const rules = provider.getRules('baking')
    const ctx: Record<string, unknown> = { flourW: 280, nodeType: 'bake' }
    const results = evaluateRules(rules, ctx)
    expect(results.find((r) => r.id === 'flour_w_too_weak')).toBeUndefined()
  })

  it('flour_w_too_weak does NOT fire when flourW is 0 (no flour data)', () => {
    const rules = provider.getRules('baking')
    const ctx: Record<string, unknown> = { flourW: 0, nodeType: 'bake' }
    const results = evaluateRules(rules, ctx)
    // flourW must be > 0, so should not fire
    expect(results.find((r) => r.id === 'flour_w_too_weak')).toBeUndefined()
  })
})

// ═══════════════════════════════════════════════════════════════
// 11. PRE-BAKE Advisories
// ═══════════════════════════════════════════════════════════════

describe('Pre-Bake advisories', () => {
  it('boil_lye_safety fires for lye_solution liquid type', () => {
    const cfg: PreBakeConfig = {
      method: 'boil',
      cfg: { liquidType: 'lye_solution', liquidTemp: 100, additivePct: 2, flipOnce: true, drainTime: 1 },
    }
    const warnings = getPreBakeWarnings(provider, cfg, 'pane', 'pane_comune', 'forno')
    const w = warnings.find((w) => w.id === 'boil_lye_safety')
    expect(w).toBeDefined()
    expect(w!.severity).toBe('warning')
  })

  it('boil_overcook fires when drainTime > 3 (used as baseDur proxy)', () => {
    const cfg: PreBakeConfig = {
      method: 'boil',
      cfg: { liquidType: 'water_malt', liquidTemp: 100, additivePct: 2, flipOnce: true, drainTime: 5 },
    }
    const warnings = getPreBakeWarnings(provider, cfg, 'pane', 'pane_comune', 'forno')
    const w = warnings.find((w) => w.id === 'boil_overcook')
    expect(w).toBeDefined()
    expect(w!.severity).toBe('info')
  })

  it('dock_not_for_neapolitan fires when subtype is dock and recipeSubtype is napoletana', () => {
    const cfg: PreBakeConfig = { method: 'dock', cfg: { tool: 'fork', pattern: 'uniform' } }
    const warnings = getPreBakeWarnings(provider, cfg, 'pizza', 'napoletana', 'forno')
    const w = warnings.find((w) => w.id === 'dock_not_for_neapolitan')
    expect(w).toBeDefined()
  })

  it('flour_tipo00_burns fires when flour dust type is tipo00', () => {
    const cfg: PreBakeConfig = { method: 'flour_dust', cfg: { flourType: 'tipo00', application: 'surface' } }
    const warnings = getPreBakeWarnings(provider, cfg, 'pane', 'pane_comune', 'forno')
    const w = warnings.find((w) => w.id === 'flour_tipo00_burns')
    expect(w).toBeDefined()
    expect(w!.severity).toBe('warning')
  })

  it('oil_evoo_high_heat fires for olive oil with griglia next bake', () => {
    const cfg: PreBakeConfig = { method: 'oil_coat', cfg: { oilType: 'olive', method: 'spray', surface: 'both' } }
    const warnings = getPreBakeWarnings(provider, cfg, 'pizza', 'napoletana', 'griglia')
    const w = warnings.find((w) => w.id === 'oil_evoo_high_heat')
    expect(w).toBeDefined()
  })

  it('steam_home_oven_only fires for water_pan steam inject method', () => {
    const cfg: PreBakeConfig = { method: 'steam_inject', cfg: { method: 'water_pan', waterVolume: 'small', removeAfter: 15 } }
    const warnings = getPreBakeWarnings(provider, cfg, 'pane', 'pane_comune', 'forno')
    const w = warnings.find((w) => w.id === 'steam_home_oven_only')
    expect(w).toBeDefined()
  })
})

// ═══════════════════════════════════════════════════════════════
// 12. RISE Warnings
// ═══════════════════════════════════════════════════════════════

describe('Rise warnings', () => {
  it('rise_too_long_for_w fires when room rise exceeds max hours for flour W', () => {
    // W=180 → maxH=2h. hours=10 >> 2
    const warnings = getRiseWarnings(provider, {
      riseMethod: 'room', hours: 10, durationMin: 600, flourW: 180,
    })
    const w = warnings.find((w) => w.id === 'rise_too_long_for_w')
    expect(w).toBeDefined()
    expect(w!.severity).toBe('warning')
  })

  it('rise_too_long_for_w does NOT fire for fridge method', () => {
    const warnings = getRiseWarnings(provider, {
      riseMethod: 'fridge', hours: 10, durationMin: 600, flourW: 180,
    })
    // Condition requires riseMethod == 'room'
    expect(warnings.find((w) => w.id === 'rise_too_long_for_w')).toBeUndefined()
  })

  it('rise_too_short fires when durationMin < 15', () => {
    const warnings = getRiseWarnings(provider, {
      riseMethod: 'room', hours: 0.1, durationMin: 10, flourW: 300,
    })
    const w = warnings.find((w) => w.id === 'rise_too_short')
    expect(w).toBeDefined()
    expect(w!.severity).toBe('info')
  })

  it('no rise warnings for reasonable room rise within W limits', () => {
    // W=300 → maxH=10h. hours=5, durationMin=300 → both within limits
    const warnings = getRiseWarnings(provider, {
      riseMethod: 'room', hours: 5, durationMin: 300, flourW: 300,
    })
    expect(warnings).toHaveLength(0)
  })
})

// ═══════════════════════════════════════════════════════════════
// 13. PRE-FERMENT Validation
// ═══════════════════════════════════════════════════════════════

describe('Pre-ferment validation', () => {
  it('pre_ferment_pct_too_low fires when preFermentPct <= 0', () => {
    const cfg = makePfCfg({ preFermentPct: 0 })
    const warnings = validatePreFerment(provider, cfg, 500, 300, 1000)
    const w = warnings.find((w) => w.id === 'pre_ferment_pct_too_low')
    expect(w).toBeDefined()
    expect(w!.severity).toBe('error')
  })

  it('pre_ferment_pct_too_high fires when preFermentPct > 100', () => {
    const cfg = makePfCfg({ preFermentPct: 110 })
    const warnings = validatePreFerment(provider, cfg, 500, 300, 1000)
    const w = warnings.find((w) => w.id === 'pre_ferment_pct_too_high')
    expect(w).toBeDefined()
    expect(w!.severity).toBe('error')
  })

  it('pre_ferment_hyd_too_low fires when hydrationPct < 40', () => {
    const cfg = makePfCfg({ hydrationPct: 30 })
    const warnings = validatePreFerment(provider, cfg, 500, 300, 1000)
    const w = warnings.find((w) => w.id === 'pre_ferment_hyd_too_low')
    expect(w).toBeDefined()
    expect(w!.severity).toBe('error')
  })

  it('pre_ferment_hyd_too_high fires when hydrationPct > 130', () => {
    const cfg = makePfCfg({ hydrationPct: 150 })
    const warnings = validatePreFerment(provider, cfg, 500, 300, 1000)
    const w = warnings.find((w) => w.id === 'pre_ferment_hyd_too_high')
    expect(w).toBeDefined()
    expect(w!.severity).toBe('error')
  })

  it('pre_ferment_flour_exceeds fires when pfFlour > totalFlour', () => {
    // 90% of 1000g dough, with 44% hydration → pfFlour ~ 625g. totalFlour = 100 → exceeds.
    const cfg = makePfCfg({ preFermentPct: 90, hydrationPct: 44 })
    const warnings = validatePreFerment(provider, cfg, 100, 300, 1000)
    const w = warnings.find((w) => w.id === 'pre_ferment_flour_exceeds')
    expect(w).toBeDefined()
    expect(w!.severity).toBe('error')
  })

  it('no validation errors for reasonable pre-ferment config', () => {
    const cfg = makePfCfg({ preFermentPct: 45, hydrationPct: 44 })
    const warnings = validatePreFerment(provider, cfg, 500, 300, 1000)
    expect(warnings).toHaveLength(0)
  })
})

// ═══════════════════════════════════════════════════════════════
// 14. DOUGH Warnings (composition)
// ═══════════════════════════════════════════════════════════════

describe('Dough warnings — composition', () => {
  const baseProfile = {
    doughHours: 18,
    yeastPct: 0.22,
    saltPct: 2.3,
    fatPct: 0,
    hydration: 65,
    recipeType: 'pizza',
    recipeSubtype: 'napoletana',
  }

  it('yeast_too_low fires for extremely low yeast', () => {
    const w = getDoughWarnings(provider, { ...baseProfile, yeastPct: 0.01 })
    expect(w.find((w) => w.id === 'yeast_too_low')).toBeDefined()
    expect(w.find((w) => w.id === 'yeast_too_low')!.severity).toBe('error')
  })

  it('yeast_too_high fires for excessive yeast', () => {
    const w = getDoughWarnings(provider, { ...baseProfile, yeastPct: 4.0 })
    expect(w.find((w) => w.id === 'yeast_too_high')).toBeDefined()
  })

  it('salt_extreme fires when salt > 3%', () => {
    const w = getDoughWarnings(provider, { ...baseProfile, saltPct: 3.5 })
    expect(w.find((w) => w.id === 'salt_extreme')).toBeDefined()
    expect(w.find((w) => w.id === 'salt_extreme')!.severity).toBe('error')
  })

  it('hyd_extreme fires when hydration > 90%', () => {
    const w = getDoughWarnings(provider, { ...baseProfile, hydration: 95 })
    expect(w.find((w) => w.id === 'hyd_extreme')).toBeDefined()
  })

  it('hyd_low fires when hydration < 45%', () => {
    const w = getDoughWarnings(provider, { ...baseProfile, hydration: 40 })
    expect(w.find((w) => w.id === 'hyd_low')).toBeDefined()
  })

  it('hours_extreme fires when doughHours > 72', () => {
    const w = getDoughWarnings(provider, { ...baseProfile, doughHours: 96 })
    expect(w.find((w) => w.id === 'hours_extreme')).toBeDefined()
  })

  it('fat_extreme excluded for dolce recipe type', () => {
    const w = getDoughWarnings(provider, {
      ...baseProfile, recipeType: 'dolce', recipeSubtype: 'brioche', fatPct: 18,
    })
    expect(w.find((w) => w.id === 'fat_extreme')).toBeUndefined()
  })

  it('fat_extreme fires for non-dolce recipe with fatPct > 12', () => {
    const w = getDoughWarnings(provider, { ...baseProfile, fatPct: 15 })
    expect(w.find((w) => w.id === 'fat_extreme')).toBeDefined()
  })

  it('no warnings for standard napoletana profile', () => {
    const w = getDoughWarnings(provider, baseProfile)
    expect(w).toHaveLength(0)
  })
})

// ═══════════════════════════════════════════════════════════════
// 15. INLINE RECONCILER Warnings
// ═══════════════════════════════════════════════════════════════

describe('Reconciler inline warnings', () => {
  it('split_sum warning when split outputs do not sum to 100%', () => {
    const graph = makeGraph(
      [makeNode({
        id: 'split', type: 'split',
        data: {
          title: 'Dividi', desc: '', group: 'Impasto', baseDur: 5, restDur: 0, restTemp: null,
          flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
          splitMode: 'pct',
          splitOutputs: [
            { handle: 'out_0', label: 'A', value: 60 },
            { handle: 'out_1', label: 'B', value: 30 },
          ],
        },
      })],
      [],
    )
    const result = reconcileGraph(graph, defaultPortioning, defaultMeta, provider)
    expect(result.warnings.some((w) => w.id.includes('split_sum'))).toBe(true)
  })

  it('autolisi_preferment_hyd warning when autolisi + preferment + high hydration', () => {
    const graph = makeGraph(
      [
        makeNode({
          id: 'auto', type: 'pre_dough', subtype: 'autolisi',
          data: {
            title: 'Autolisi', desc: '', group: 'Impasto', baseDur: 30, restDur: 0, restTemp: null,
            flours: [{ id: 0, type: 'gt_00_for', g: 300, temp: null }],
            liquids: [{ id: 0, type: 'Acqua', g: 250, temp: null }],
            extras: [], yeasts: [], salts: [], sugars: [], fats: [],
          },
        }),
        makeNode({
          id: 'pf', type: 'pre_ferment', subtype: 'biga',
          data: {
            title: 'Biga', desc: '', group: 'Impasto', baseDur: 15, restDur: 0, restTemp: null,
            flours: [{ id: 0, type: 'gt_00_for', g: 200, temp: null }],
            liquids: [{ id: 0, type: 'Acqua', g: 170, temp: null }],
            extras: [], yeasts: [], salts: [], sugars: [], fats: [],
          },
        }),
      ],
      [],
    )
    const result = reconcileGraph(graph, { ...defaultPortioning, targetHyd: 84 }, defaultMeta, provider)
    expect(result.warnings.some((w) => w.id === 'autolisi_preferment_hyd')).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
// 16. ACTION EXECUTION — Full Chain
// ═══════════════════════════════════════════════════════════════

describe('Action execution — full chain', () => {
  it('temp_high warning includes _suggestedTemp and updateNode action', () => {
    const cfg = makeCookingCfg('forno', makeOvenCfg({ temp: 450 }))
    const warnings = getBakeWarnings(provider, cfg, 'pizza', 'napoletana', 3, emptyNodeData)
    const w = warnings.find((w) => w.id === 'temp_high')!
    expect(w).toBeDefined()

    // Check _ctx contains suggested temp
    expect(w._ctx).toBeDefined()
    expect(w._ctx!._suggestedTemp).toBeDefined()
    expect(typeof w._ctx!._suggestedTemp).toBe('number')
    // (280+350)/2 = 315
    expect(w._ctx!._suggestedTemp).toBe(315)

    // Check action structure
    expect(w.actions).toBeDefined()
    expect(w.actions![0].labelKey).toBe('action.set_suggested_temp')
    expect(w.actions![0].mutations[0].type).toBe('updateNode')
  })

  it('steam_too_long for forno includes addNodeAfter with forno subtype', () => {
    const cfg = makeCookingCfg('forno', makeOvenCfg({ temp: 220, ovenMode: 'steam' }))
    const warnings = getBakeWarnings(provider, cfg, 'pane', 'pane_comune', 40, emptyNodeData)
    const w = warnings.find((w) => w.id === 'steam_too_long')!
    expect(w).toBeDefined()
    expect(w.actions).toBeDefined()

    const addMutation = w.actions![0].mutations.find((m) => m.type === 'addNodeAfter')!
    expect(addMutation).toBeDefined()
    expect(addMutation.subtype).toBe('forno')
    expect((addMutation.data as any).ovenCfg.ovenMode).toBe('static')
  })

  it('steam_too_long for pentola includes addNodeAfter with pentola + lidOn=false', () => {
    const cfg = makeCookingCfg('pentola', makeOvenCfg({ temp: 240, ovenMode: 'steam', lidOn: true }))
    const warnings = getBakeWarnings(provider, cfg, 'pane', 'pane_comune', 40, emptyNodeData)
    const w = warnings.find((w) => w.id === 'steam_too_long')!
    expect(w).toBeDefined()
    expect(w.actions).toBeDefined()

    const addMutation = w.actions![0].mutations.find((m) => m.type === 'addNodeAfter')!
    expect(addMutation).toBeDefined()
    expect(addMutation.subtype).toBe('pentola')
    expect((addMutation.data as any).ovenCfg.lidOn).toBe(false)
    expect((addMutation.data as any).ovenCfg.ovenMode).toBe('static')
    expect((addMutation.data as any).title).toBe('Doratura (senza coperchio)')
  })

  it('fry_finish_suggest includes addNodeAfter action for oven finish', () => {
    const cfg = makeCookingCfg('frittura', { fryMethod: 'deep', oilTemp: 180, flipHalf: true, maxDoughWeight: 175 })
    const warnings = getBakeWarnings(provider, cfg, 'pizza', 'napoletana', 5, emptyNodeData)
    const w = warnings.find((w) => w.id === 'fry_finish_suggest')!
    expect(w).toBeDefined()
    expect(w.actions![0].mutations[0].type).toBe('addNodeAfter')
  })

  it('pan_finish_suggest includes addNodeAfter action for grill finish', () => {
    const cfg = makeCookingCfg('padella', {
      panMaterial: 'cast_iron', panSize: 28, temp: 220,
      oilSpray: true, flipOnce: true, lidUsed: false,
    })
    const warnings = getBakeWarnings(provider, cfg, 'pizza', 'napoletana', 5, emptyNodeData)
    const w = warnings.find((w) => w.id === 'pan_finish_suggest')!
    expect(w).toBeDefined()
    expect(w.actions![0].mutations[0].type).toBe('addNodeAfter')
  })
})

// ═══════════════════════════════════════════════════════════════
// 17. ADVISORY DEDUPLICATION
// ═══════════════════════════════════════════════════════════════

describe('Advisory deduplication', () => {
  it('steam_too_long action is deduplicated when downstream node has advisorySourceId', () => {
    const graph = makeGraph(
      [
        makeNode({
          id: 'dough', type: 'dough',
          data: {
            title: 'Impasto', desc: '', group: 'Impasto', baseDur: 20, restDur: 0, restTemp: null,
            flours: [{ id: 0, type: 'gt_00_for', g: 500, temp: null }],
            liquids: [{ id: 0, type: 'Acqua', g: 300, temp: null }],
            extras: [], yeasts: [{ id: 0, type: 'fresh', g: 5 }],
            salts: [], sugars: [], fats: [], kneadMethod: 'hand',
          },
        }),
        makeNode({
          id: 'bake', type: 'bake', subtype: 'pentola',
          data: {
            title: 'Cottura', desc: '', group: 'Impasto', baseDur: 40, restDur: 0, restTemp: null,
            flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
            cookingCfg: makeCookingCfg('pentola', makeOvenCfg({ temp: 240, ovenMode: 'steam', lidOn: true })),
            ovenCfg: makeOvenCfg({ temp: 240, ovenMode: 'steam', lidOn: true }),
          },
        }),
        makeNode({
          id: 'dry_phase', type: 'bake', subtype: 'pentola',
          data: {
            title: 'Doratura', desc: '', group: 'Impasto', baseDur: 12, restDur: 0, restTemp: null,
            flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
            advisorySourceId: 'steam_too_long',
          },
        }),
        makeNode({
          id: 'done', type: 'done',
          data: {
            title: 'Fine', desc: '', group: 'Impasto', baseDur: 0, restDur: 0, restTemp: null,
            flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
          },
        }),
      ],
      [
        makeEdge('dough', 'bake'),
        makeEdge('bake', 'dry_phase'),
        makeEdge('dry_phase', 'done'),
      ],
    )

    // Deduplication logic: check downstream nodes for advisorySourceId
    const bakeId = 'bake'
    const appliedIds = new Set<string>()
    const downstreamIds = graph.edges.filter((e) => e.source === bakeId).map((e) => e.target)
    for (const dId of downstreamIds) {
      const dNode = graph.nodes.find((n) => n.id === dId)
      if (dNode?.data.advisorySourceId) appliedIds.add(dNode.data.advisorySourceId)
    }
    expect(appliedIds.has('steam_too_long')).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
// 18. EXCLUSIONS & SUPPRESSION
// ═══════════════════════════════════════════════════════════════

describe('Exclusions & Suppression', () => {
  it('fat_extreme excluded for dolce recipe type', () => {
    const w = getDoughWarnings(provider, {
      doughHours: 18, yeastPct: 0.22, saltPct: 0.8,
      fatPct: 18, hydration: 65, recipeType: 'dolce', recipeSubtype: 'brioche',
    })
    expect(w.find((w) => w.id === 'fat_extreme')).toBeUndefined()
  })

  it('fat_extreme fires for non-dolce with same fatPct', () => {
    const w = getDoughWarnings(provider, {
      doughHours: 18, yeastPct: 0.22, saltPct: 2.3,
      fatPct: 18, hydration: 65, recipeType: 'pizza', recipeSubtype: 'napoletana',
    })
    expect(w.find((w) => w.id === 'fat_extreme')).toBeDefined()
  })

  it('pentola_no_lid excluded for pizza recipe type', () => {
    const cfg = makeCookingCfg('pentola', makeOvenCfg({ temp: 240, ovenMode: 'static', lidOn: false }))
    const warnings = getBakeWarnings(provider, cfg, 'pizza', 'napoletana', 25, emptyNodeData)
    expect(warnings.find((w) => w.id === 'pentola_no_lid')).toBeUndefined()
  })

  it('pentola_two_phase suppressed by steam_too_long (not independently visible)', () => {
    // Both pentola_two_phase and steam_too_long fire when:
    //   _cookingMethod=pentola, ovenCfg.lidOn=true, ovenMode=steam, baseDur>30
    // But pentola_two_phase has suppressedBy: ['steam_too_long']
    const rules = provider.getRules('baking')
    const ctx: Record<string, unknown> = {
      nodeType: 'bake',
      _cookingMethod: 'pentola',
      ovenCfg: { ovenMode: 'steam', lidOn: true },
      baseDur: 35,
      recipeType: 'pane',
    }
    const results = evaluateRules(rules, ctx)
    expect(results.find((r) => r.id === 'steam_too_long')).toBeDefined()
    expect(results.find((r) => r.id === 'pentola_two_phase')).toBeUndefined()
  })

  it('mode_not_recommended excluded for dolce', () => {
    const rules = provider.getRules('baking')
    const ctx: Record<string, unknown> = {
      nodeType: 'bake',
      ovenCfg: { ovenMode: 'fan' },
      recipeType: 'dolce',
    }
    const results = evaluateRules(rules, ctx)
    expect(results.find((r) => r.id === 'mode_not_recommended')).toBeUndefined()
  })
})

// ═══════════════════════════════════════════════════════════════
// 19. toActionableWarnings BRIDGE
// ═══════════════════════════════════════════════════════════════

describe('toActionableWarnings bridge', () => {
  it('converts RuleResult[] to ActionableWarning[] with sourceNodeId', () => {
    const cfg = makeCookingCfg('forno', makeOvenCfg({ temp: 450 }))
    const results = getBakeWarnings(provider, cfg, 'pizza', 'napoletana', 3, emptyNodeData)
    const actionable = toActionableWarnings(results, 'bake_1')

    expect(actionable.length).toBeGreaterThan(0)
    expect(actionable[0].sourceNodeId).toBe('bake_1')
    expect(actionable[0].messageKey).toBeDefined()
    expect(actionable[0].severity).toBeDefined()
  })

  it('preserves actions through conversion', () => {
    const cfg = makeCookingCfg('forno', makeOvenCfg({ temp: 220, ovenMode: 'steam' }))
    const results = getBakeWarnings(provider, cfg, 'pane', 'pane_comune', 40, emptyNodeData)
    const steamResult = results.find((r) => r.id === 'steam_too_long')!
    expect(steamResult.actions).toBeDefined()

    const actionable = toActionableWarnings([steamResult], 'bake_1')
    expect(actionable[0].actions).toBeDefined()
    expect(actionable[0].actions!.length).toBeGreaterThan(0)
    expect(actionable[0].actions![0].mutations.length).toBeGreaterThan(0)
  })
})

// ═══════════════════════════════════════════════════════════════
// 20. PRE-BAKE VALIDATION (via validateConfig)
// ═══════════════════════════════════════════════════════════════

describe('Pre-Bake validation rules', () => {
  it('boil_must_bake_after fires for any boil subtype', () => {
    const cfg: PreBakeConfig = {
      method: 'boil',
      cfg: { liquidType: 'water_malt', liquidTemp: 100, additivePct: 2, flipOnce: true, drainTime: 1 },
    }
    const warnings = getPreBakeWarnings(provider, cfg, 'pane', 'pane_comune', 'forno')
    const w = warnings.find((w) => w.id === 'boil_must_bake_after')
    expect(w).toBeDefined()
    expect(w!.severity).toBe('warning')
  })

  it('flour_excess_remove fires for any flour_dust subtype', () => {
    const cfg: PreBakeConfig = { method: 'flour_dust', cfg: { flourType: 'rice', application: 'surface' } }
    const warnings = getPreBakeWarnings(provider, cfg, 'pane', 'pane_comune', 'forno')
    const w = warnings.find((w) => w.id === 'flour_excess_remove')
    expect(w).toBeDefined()
    expect(w!.severity).toBe('info')
  })

  it('steam_remove_for_crust fires for any steam_inject subtype', () => {
    const cfg: PreBakeConfig = { method: 'steam_inject', cfg: { method: 'steam_injection', waterVolume: 'medium', removeAfter: 15 } }
    const warnings = getPreBakeWarnings(provider, cfg, 'pane', 'pane_comune', 'forno')
    const w = warnings.find((w) => w.id === 'steam_remove_for_crust')
    expect(w).toBeDefined()
    expect(w!.severity).toBe('info')
  })
})
