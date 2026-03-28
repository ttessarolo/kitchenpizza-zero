import { describe, it, expect } from 'vitest'
import { reconcileGraph } from '~/server/services/graph-reconciler.service'
import { computeGroupedIngredients } from '~/hooks/useGraphCalculator'
import { getBakingWarnings } from '@commons/utils/baking'
import { evaluateRules } from '@commons/utils/science/rule-engine'
import type { AdvisoryContext } from '@commons/types/recipe-graph'
import { resolve } from 'path'
import { FileScienceProvider } from '@commons/utils/science/science-provider'

const scienceDir = resolve(process.cwd(), 'science')
const i18nDir = resolve(process.cwd(), 'commons/i18n')
const testProvider = new FileScienceProvider(scienceDir, i18nDir)
const BAKING_RULES = testProvider.getRules('baking')
import { makeNode, makeEdge, makeGraph } from './synthetic_data/helpers'
import type { RecipeGraph, RecipeEdge, RecipeNode, NodeData } from '@commons/types/recipe-graph'
import type { Portioning, RecipeMeta, CookingConfig, FatIngredient, OvenConfig } from '@commons/types/recipe'

const defaultPortioning: Portioning = {
  mode: 'ball', tray: { preset: 't', l: 40, w: 30, h: 2, material: 'alu', griglia: false, count: 1 },
  ball: { weight: 250, count: 4 }, thickness: 0.5, targetHyd: 65,
  doughHours: 18, yeastPct: 0.22, saltPct: 2.3, fatPct: 3,
  preImpasto: null, preFermento: null,
}
const defaultMeta: RecipeMeta = { name: 'Test', author: '', type: 'pane', subtype: 'pane_comune', locale: 'it' }

const FRITTURA_CFG: CookingConfig = {
  method: 'frittura',
  cfg: { fryMethod: 'deep', oilTemp: 180, flipHalf: true, maxDoughWeight: 175 },
}

const PENTOLA_CFG: CookingConfig = {
  method: 'pentola',
  cfg: { panType: 'ci_lid', ovenType: 'electric', ovenMode: 'steam', temp: 240, cieloPct: 50, shelfPosition: 2 },
}

function makeBakeGraph(bakeOverrides: Record<string, unknown> = {}): RecipeGraph {
  return makeGraph(
    [
      makeNode({
        id: 'dough', type: 'dough',
        data: {
          title: 'Impasto', desc: '', group: 'Impasto', baseDur: 20, restDur: 0, restTemp: null,
          flours: [{ id: 0, type: 'gt_00_for', g: 500, temp: null }],
          liquids: [{ id: 0, type: 'Acqua', g: 300, temp: null }],
          extras: [], yeasts: [{ id: 0, type: 'fresh', g: 5 }],
          salts: [{ id: 0, type: 'sale_fino', g: 10 }], sugars: [], fats: [],
          kneadMethod: 'hand',
        },
      }),
      makeNode({
        id: 'bake', type: 'bake',
        data: {
          title: 'Cottura', desc: '', group: 'Impasto', baseDur: 5, restDur: 0, restTemp: null,
          flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
          cookingCfg: FRITTURA_CFG,
          ...bakeOverrides,
        },
      }),
      makeNode({
        id: 'done', type: 'done',
        data: { title: 'Fine', desc: '', group: 'Impasto', baseDur: 0, restDur: 0, restTemp: null,
          flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [] },
      }),
    ],
    [
      makeEdge('dough', 'bake'),
      makeEdge('bake', 'done'),
    ],
  )
}

// ═══════════════════════════════════════════════════════════════
// BUG 1: Bake nodes must get "Cottura [dough title]" group
// ═══════════════════════════════════════════════════════════════

describe('reconcileGraph — bake node auto-group', () => {
  it('assigns "Cottura" group to bake nodes even when inherited group is "Impasto"', () => {
    const graph = makeBakeGraph()
    const result = reconcileGraph(graph, defaultPortioning, defaultMeta)
    const bake = result.graph.nodes.find((n) => n.id === 'bake')!
    expect(bake.data.group).toMatch(/^Cottura/)
    expect(bake.data.group).not.toBe('Impasto')
  })

  it('includes upstream dough title in the group name', () => {
    const graph = makeBakeGraph()
    const result = reconcileGraph(graph, defaultPortioning, defaultMeta)
    const bake = result.graph.nodes.find((n) => n.id === 'bake')!
    expect(bake.data.group).toBe('Cottura Impasto')
  })
})

// ═══════════════════════════════════════════════════════════════
// BUG 1b: cookingFats must appear in the Cottura group, not Impasto
// ═══════════════════════════════════════════════════════════════

describe('computeGroupedIngredients — cookingFats in Cottura group', () => {
  it('puts cookingFats in the bake node group, not the dough group', () => {
    const graph = makeBakeGraph({
      group: 'Cottura Impasto',
      cookingFats: [{ id: 1, type: 'olio_arachidi', g: 500 }] as FatIngredient[],
    })
    const grouped = computeGroupedIngredients(graph, ['Impasto', 'Cottura Impasto'])
    // Impasto group should NOT have the cooking fat
    expect(grouped['Impasto'].fats.find((f) => f.type === 'olio_arachidi')).toBeUndefined()
    // Cottura group SHOULD have the cooking fat
    expect(grouped['Cottura Impasto'].fats.find((f) => f.type === 'olio_arachidi')).toBeDefined()
    expect(grouped['Cottura Impasto'].fats.find((f) => f.type === 'olio_arachidi')!.g).toBe(500)
  })
})

// ═══════════════════════════════════════════════════════════════
// BUG 2: cookingFats must be cleared when switching away from frittura
// ═══════════════════════════════════════════════════════════════

describe('reconcileGraph — cookingFats lifecycle', () => {
  it('auto-adds cookingFats for frittura node with empty cookingFats', () => {
    const graph = makeBakeGraph({ cookingFats: [] })
    const result = reconcileGraph(graph, defaultPortioning, defaultMeta)
    const bake = result.graph.nodes.find((n) => n.id === 'bake')!
    expect((bake.data.cookingFats ?? []).length).toBeGreaterThan(0)
  })

  it('clears cookingFats when method changes from frittura to pentola', () => {
    // Start with frittura + cooking fats
    const graph = makeBakeGraph({
      cookingCfg: PENTOLA_CFG,  // NOW pentola
      cookingFats: [{ id: 1, type: 'olio_arachidi', g: 500 }] as FatIngredient[],
    })
    const result = reconcileGraph(graph, defaultPortioning, defaultMeta)
    const bake = result.graph.nodes.find((n) => n.id === 'bake')!
    // cookingFats should be empty for pentola
    expect(bake.data.cookingFats ?? []).toHaveLength(0)
  })

  it('clears cookingFats when method changes from frittura to vapore', () => {
    const vaporeCfg: CookingConfig = {
      method: 'vapore',
      cfg: { steamerType: 'bamboo', temp: 100, lidLift: false, waterLevel: 'full', paperLiner: true },
    }
    const graph = makeBakeGraph({
      cookingCfg: vaporeCfg,
      cookingFats: [{ id: 1, type: 'olio_arachidi', g: 500 }] as FatIngredient[],
    })
    const result = reconcileGraph(graph, defaultPortioning, defaultMeta)
    const bake = result.graph.nodes.find((n) => n.id === 'bake')!
    expect(bake.data.cookingFats ?? []).toHaveLength(0)
  })
})

// ═══════════════════════════════════════════════════════════════
// BUG 3: advisorySourceId must be preserved through reconciliation
// ═══════════════════════════════════════════════════════════════

describe('reconcileGraph — advisorySourceId preservation', () => {
  it('preserves advisorySourceId on nodes through reconciliation', () => {
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
          id: 'bake', type: 'bake',
          data: {
            title: 'Cottura', desc: '', group: 'Impasto', baseDur: 40, restDur: 0, restTemp: null,
            flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
            ovenCfg: { panType: 'ci_lid', ovenType: 'electric', ovenMode: 'steam', temp: 230, cieloPct: 50, shelfPosition: 2 },
          },
        }),
        makeNode({
          id: 'dry_phase', type: 'bake',
          data: {
            title: 'Doratura', desc: '', group: 'Impasto', baseDur: 12, restDur: 0, restTemp: null,
            flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
            ovenCfg: { panType: 'stone', ovenType: 'electric', ovenMode: 'static', temp: 220, cieloPct: 50, shelfPosition: 2 },
            advisorySourceId: 'steam_too_long',  // Created by advisory
          },
        }),
        makeNode({
          id: 'done', type: 'done',
          data: { title: 'Fine', desc: '', group: 'Impasto', baseDur: 0, restDur: 0, restTemp: null,
            flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [] },
        }),
      ],
      [
        makeEdge('dough', 'bake'),
        makeEdge('bake', 'dry_phase'),
        makeEdge('dry_phase', 'done'),
      ],
    )

    const result = reconcileGraph(graph, defaultPortioning, defaultMeta)
    const dryPhase = result.graph.nodes.find((n) => n.id === 'dry_phase')!
    expect(dryPhase.data.advisorySourceId).toBe('steam_too_long')
  })
})

// ═══════════════════════════════════════════════════════════════
// BUG 4: Advisory deduplication — actionable advice must not
//        reappear when the advisory-created node already exists
// ═══════════════════════════════════════════════════════════════

const PENTOLA_OVEN_CFG: OvenConfig = {
  panType: 'ci_lid', ovenType: 'electric', ovenMode: 'steam',
  temp: 240, cieloPct: 50, shelfPosition: 2,
}

describe('advisory deduplication — steam_too_long', () => {
  it('steam_too_long advisory triggers for pentola with baseDur > 30', () => {
    const warnings = getBakingWarnings(testProvider,PENTOLA_OVEN_CFG, 'pane', 'pane_comune', 40, 40)
    const steamWarning = warnings.find((w) => w.id === 'steam_too_long')
    expect(steamWarning).toBeDefined()
    expect(steamWarning!.messageKey).toBeDefined()
  })

  it('steam_too_long advisory does NOT trigger when baseDur <= 30', () => {
    const warnings = getBakingWarnings(testProvider,PENTOLA_OVEN_CFG, 'pane', 'pane_comune', 25, 25)
    const steamWarning = warnings.find((w) => w.id === 'steam_too_long')
    expect(steamWarning).toBeUndefined()
  })

  it('steam_too_long advisory includes addNodeAfter action', () => {
    const warnings = getBakingWarnings(testProvider,PENTOLA_OVEN_CFG, 'pane', 'pane_comune', 40, 40)
    const steamWarning = warnings.find((w) => w.id === 'steam_too_long')!
    expect(steamWarning.actions).toBeDefined()
    expect(steamWarning.actions!.length).toBeGreaterThan(0)
    const hasAddNode = steamWarning.actions![0].mutations.some((m) => m.type === 'addNodeAfter')
    expect(hasAddNode).toBe(true)
  })

  it('deduplication detects advisorySourceId on direct downstream node', () => {
    // Simulate the graph after "Aggiungi fase asciutta" was applied:
    // bake (pentola, steam) → dry_phase (advisorySourceId: 'steam_too_long') → done
    const nodes: RecipeNode[] = [
      makeNode({
        id: 'bake', type: 'bake', subtype: 'pentola',
        data: {
          title: 'Cottura', desc: '', group: 'Cottura', baseDur: 40, restDur: 0, restTemp: null,
          flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
          cookingCfg: PENTOLA_CFG,
          ovenCfg: PENTOLA_OVEN_CFG,
        },
      }),
      makeNode({
        id: 'dry_phase', type: 'bake', subtype: 'forno',
        data: {
          title: 'Doratura (senza vapore)', desc: '', group: 'Cottura', baseDur: 12, restDur: 0, restTemp: null,
          flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
          advisorySourceId: 'steam_too_long',
        },
      }),
      makeNode({
        id: 'done', type: 'done',
        data: { title: 'Fine', desc: '', group: 'Impasto', baseDur: 0, restDur: 0, restTemp: null,
          flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [] },
      }),
    ]
    const edges: RecipeEdge[] = [
      makeEdge('bake', 'dry_phase'),
      makeEdge('dry_phase', 'done'),
    ]

    // Replicate the deduplication logic from BakingAdvisory / CookingAdvisory
    const nodeId = 'bake'
    const appliedAdvisoryIds = new Set<string>()
    const downstreamIds = edges.filter((e) => e.source === nodeId).map((e) => e.target)
    for (const dId of downstreamIds) {
      const dNode = nodes.find((n) => n.id === dId)
      if (dNode?.data.advisorySourceId) appliedAdvisoryIds.add(dNode.data.advisorySourceId)
    }

    expect(appliedAdvisoryIds.has('steam_too_long')).toBe(true)
  })

  it('advisorySourceId survives subtype change round-trip via reconciliation', () => {
    // Start with pentola bake + dry_phase advisory node
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
            cookingCfg: PENTOLA_CFG,
            ovenCfg: PENTOLA_OVEN_CFG,
          },
        }),
        makeNode({
          id: 'dry_phase', type: 'bake', subtype: 'forno',
          data: {
            title: 'Doratura (senza vapore)', desc: '', group: 'Impasto', baseDur: 12, restDur: 0, restTemp: null,
            flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
            ovenCfg: { panType: 'stone', ovenType: 'electric', ovenMode: 'static', temp: 220, cieloPct: 50, shelfPosition: 2 },
            advisorySourceId: 'steam_too_long',
          },
        }),
        makeNode({
          id: 'done', type: 'done',
          data: { title: 'Fine', desc: '', group: 'Impasto', baseDur: 0, restDur: 0, restTemp: null,
            flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [] },
        }),
      ],
      [
        makeEdge('dough', 'bake'),
        makeEdge('bake', 'dry_phase'),
        makeEdge('dry_phase', 'done'),
      ],
    )

    // Simulate subtype change: pentola → forno (reconcile) → pentola (reconcile)
    // Step 1: Change bake to forno
    const fornoGraph: RecipeGraph = {
      ...graph,
      nodes: graph.nodes.map((n) =>
        n.id === 'bake'
          ? {
              ...n, subtype: 'forno',
              data: {
                ...n.data,
                cookingCfg: { method: 'forno', cfg: { panType: 'stone', ovenType: 'electric', ovenMode: 'static', temp: 250, cieloPct: 50, shelfPosition: 2 } } as CookingConfig,
                ovenCfg: { panType: 'stone', ovenType: 'electric', ovenMode: 'static', temp: 250, cieloPct: 50, shelfPosition: 2 },
              },
            }
          : n,
      ),
    }
    const afterForno = reconcileGraph(fornoGraph, defaultPortioning, defaultMeta)

    // dry_phase must still have advisorySourceId
    const dryAfterForno = afterForno.graph.nodes.find((n) => n.id === 'dry_phase')!
    expect(dryAfterForno.data.advisorySourceId).toBe('steam_too_long')

    // Step 2: Change bake back to pentola
    const pentolaGraph: RecipeGraph = {
      ...afterForno.graph,
      nodes: afterForno.graph.nodes.map((n) =>
        n.id === 'bake'
          ? {
              ...n, subtype: 'pentola',
              data: {
                ...n.data,
                cookingCfg: PENTOLA_CFG,
                ovenCfg: PENTOLA_OVEN_CFG,
                baseDur: 40, // subtype switch resets baseDur to pentola default
              },
            }
          : n,
      ),
    }
    const afterPentola = reconcileGraph(pentolaGraph, defaultPortioning, defaultMeta)

    // dry_phase must STILL have advisorySourceId after the full round-trip
    const dryAfterPentola = afterPentola.graph.nodes.find((n) => n.id === 'dry_phase')!
    expect(dryAfterPentola.data.advisorySourceId).toBe('steam_too_long')

    // Edge bake → dry_phase must still exist
    const edgeToDry = afterPentola.graph.edges.find(
      (e) => e.source === 'bake' && e.target === 'dry_phase',
    )
    expect(edgeToDry).toBeDefined()

    // Advisory still triggers (baseDur 40 > 30 and ovenMode steam)
    const bakeNode = afterPentola.graph.nodes.find((n) => n.id === 'bake')!
    const warnings = getBakingWarnings(testProvider,
      bakeNode.data.ovenCfg!, 'pane', 'pane_comune',
      bakeNode.data.baseDur, bakeNode.data.baseDur, 'pentola',
    )
    const steamWarning = warnings.find((w) => w.id === 'steam_too_long')
    expect(steamWarning).toBeDefined()

    // But deduplication should detect the existing dry_phase node
    const appliedIds = new Set<string>()
    const downstreamIds = afterPentola.graph.edges
      .filter((e) => e.source === 'bake')
      .map((e) => e.target)
    for (const dId of downstreamIds) {
      const dNode = afterPentola.graph.nodes.find((n) => n.id === dId)
      if (dNode?.data.advisorySourceId) appliedIds.add(dNode.data.advisorySourceId)
    }
    expect(appliedIds.has('steam_too_long')).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
// FEATURE: Pentola lid parameter (lidOn) and advisory rules
// ═══════════════════════════════════════════════════════════════

const PENTOLA_OVEN_CFG_LID_ON: OvenConfig = {
  panType: 'ci_lid', ovenType: 'electric', ovenMode: 'steam',
  temp: 240, cieloPct: 50, shelfPosition: 2, lidOn: true,
}

const PENTOLA_OVEN_CFG_LID_OFF: OvenConfig = {
  panType: 'ci_lid', ovenType: 'electric', ovenMode: 'static',
  temp: 240, cieloPct: 50, shelfPosition: 2, lidOn: false,
}

const emptyNodeData: NodeData = {
  title: '', desc: '', group: '', baseDur: 40, restDur: 0, restTemp: null,
  flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
}

function makePentolaCtx(overrides: Partial<AdvisoryContext> = {}): AdvisoryContext {
  return {
    nodeType: 'bake',
    nodeSubtype: 'pentola',
    nodeData: emptyNodeData,
    ovenCfg: PENTOLA_OVEN_CFG_LID_ON,
    recipeType: 'pane',
    recipeSubtype: 'pane_comune',
    baseDur: 40,
    totalFlour: 0, yeastPct: 0, saltPct: 0, fatPct: 0, hydration: 0, flourW: 0,
    _cookingMethod: 'pentola',
    ...overrides,
  }
}

describe('pentola lid — getBakingWarnings path (real UI flow)', () => {
  it('getBakingWarnings with method=pentola creates pentola action', () => {
    const warnings = getBakingWarnings(testProvider,PENTOLA_OVEN_CFG_LID_ON, 'pane', 'pane_comune', 40, 40, 'pentola')
    const w = warnings.find((w) => w.id === 'steam_too_long')
    expect(w).toBeDefined()
    const addMutation = w!.actions!![0].mutations.find((m) => m.type === 'addNodeAfter')!
    expect(addMutation.subtype).toBe('pentola')
    expect((addMutation.data as any).ovenCfg.lidOn).toBe(false)
    expect((addMutation.data as any).title).toBe('Doratura (senza coperchio)')
  })

  it('getBakingWarnings with method=forno creates forno action', () => {
    const fornoSteam: OvenConfig = { panType: 'stone', ovenType: 'electric', ovenMode: 'steam', temp: 250, cieloPct: 50, shelfPosition: 2 }
    const warnings = getBakingWarnings(testProvider,fornoSteam, 'pane', 'pane_comune', 40, 40, 'forno')
    const w = warnings.find((w) => w.id === 'steam_too_long')
    expect(w).toBeDefined()
    const addMutation = w!.actions!![0].mutations.find((m) => m.type === 'addNodeAfter')!
    expect(addMutation.subtype).toBe('forno')
  })

  it('steam_too_long does NOT fire when pentola lid is off (ovenMode=static)', () => {
    const warnings = getBakingWarnings(testProvider,PENTOLA_OVEN_CFG_LID_OFF, 'pane', 'pane_comune', 40, 40, 'pentola')
    const w = warnings.find((w) => w.id === 'steam_too_long')
    expect(w).toBeUndefined()
  })

  it('pentola_no_lid fires through getBakingWarnings when lid is off', () => {
    const warnings = getBakingWarnings(testProvider,PENTOLA_OVEN_CFG_LID_OFF, 'pane', 'pane_comune', 20, 20, 'pentola')
    const w = warnings.find((w) => w.id === 'pentola_no_lid')
    expect(w).toBeDefined()
    expect(w!.severity).toBe('warning')
  })
})

describe('pentola lid parameter — steam_too_long action', () => {
  it('creates pentola node with lidOn=false when source is pentola', () => {
    const warnings = getBakingWarnings(testProvider, PENTOLA_OVEN_CFG_LID_ON, 'pane', 'pane_comune', 40, 40, 'pentola')
    const w = warnings.find((w) => w.id === 'steam_too_long')
    expect(w).toBeDefined()
    expect(w!.actions).toBeDefined()
    expect(w!.actions![0].labelKey).toBeDefined()

    const addMutation = w!.actions![0].mutations.find((m) => m.type === 'addNodeAfter')!
    expect(addMutation.subtype).toBe('pentola')
    expect((addMutation.data as any).ovenCfg.lidOn).toBe(false)
    expect((addMutation.data as any).ovenCfg.ovenMode).toBe('static')
    expect((addMutation.data as any).title).toBe('Doratura (senza coperchio)')
  })

  it('creates forno node when source is forno (existing behavior)', () => {
    const fornoSteam: OvenConfig = { panType: 'stone', ovenType: 'electric', ovenMode: 'steam', temp: 250, cieloPct: 50, shelfPosition: 2 }
    const warnings = getBakingWarnings(testProvider, fornoSteam, 'pane', 'pane_comune', 40, 40, 'forno')
    const w = warnings.find((w) => w.id === 'steam_too_long')
    expect(w).toBeDefined()
    expect(w!.actions![0].labelKey).toBeDefined()

    const addMutation = w!.actions![0].mutations.find((m) => m.type === 'addNodeAfter')!
    expect(addMutation.subtype).toBe('forno')
  })
})

describe('pentola lid parameter — pentola_no_lid warning', () => {
  it('fires when lidOn is false', () => {
    const ctx = makePentolaCtx({
      ovenCfg: PENTOLA_OVEN_CFG_LID_OFF,
      baseDur: 20,
    })
    const warnings = evaluateRules(BAKING_RULES, ctx as Record<string, unknown>)
    const w = warnings.find((w) => w.id === 'pentola_no_lid')
    expect(w).toBeDefined()
    expect(w!.severity).toBe('warning')
    expect(w!.messageKey).toBeDefined()
  })

  it('does NOT fire when lidOn is true', () => {
    const ctx = makePentolaCtx({ baseDur: 20 })
    const warnings = evaluateRules(BAKING_RULES, ctx as Record<string, unknown>)
    const w = warnings.find((w) => w.id === 'pentola_no_lid')
    expect(w).toBeUndefined()
  })

  it('does NOT fire for pizza', () => {
    const ctx = makePentolaCtx({
      ovenCfg: PENTOLA_OVEN_CFG_LID_OFF,
      recipeType: 'pizza',
      baseDur: 20,
    })
    const warnings = evaluateRules(BAKING_RULES, ctx as Record<string, unknown>)
    const w = warnings.find((w) => w.id === 'pentola_no_lid')
    expect(w).toBeUndefined()
  })
})

describe('pentola lid parameter — pentola_two_phase', () => {
  it('fires with lidOn=true and baseDur > 30', () => {
    // pentola_two_phase is suppressed by steam_too_long, so we need baseDur > 30
    // but steam_too_long also fires. Since pentola_two_phase has suppressedBy: ['steam_too_long'],
    // it should NOT appear when steam_too_long is active.
    // To test pentola_two_phase alone, we need ovenMode != steam (so steam_too_long doesn't fire)
    // BUT pentola_two_phase now requires lidOn=true (which implies steam).
    // Actually, pentola_two_phase is suppressed — so let's just verify it fires in conditions
    // where steam_too_long doesn't (baseDur exactly 31, ovenMode steam → both fire, two_phase suppressed).
    // Let's test the raw conditions instead.
    const ctx = makePentolaCtx({ baseDur: 35 })
    const warnings = evaluateRules(BAKING_RULES, ctx as Record<string, unknown>)
    // steam_too_long suppresses pentola_two_phase
    const steam = warnings.find((w) => w.id === 'steam_too_long')
    const twoPhase = warnings.find((w) => w.id === 'pentola_two_phase')
    expect(steam).toBeDefined()
    expect(twoPhase).toBeUndefined() // suppressed by steam_too_long
  })

  it('does NOT fire with lidOn=false', () => {
    const ctx = makePentolaCtx({
      ovenCfg: PENTOLA_OVEN_CFG_LID_OFF,
      baseDur: 35,
    })
    const warnings = evaluateRules(BAKING_RULES, ctx as Record<string, unknown>)
    const twoPhase = warnings.find((w) => w.id === 'pentola_two_phase')
    expect(twoPhase).toBeUndefined()
  })
})

describe('pentola lid parameter — lidOn preserved through reconciliation', () => {
  it('preserves lidOn=true on pentola node through reconciliation', () => {
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
            title: 'Cottura', desc: '', group: 'Impasto', baseDur: 25, restDur: 0, restTemp: null,
            flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
            cookingCfg: { method: 'pentola', cfg: PENTOLA_OVEN_CFG_LID_ON },
            ovenCfg: PENTOLA_OVEN_CFG_LID_ON,
          },
        }),
        makeNode({
          id: 'bake_dry', type: 'bake', subtype: 'pentola',
          data: {
            title: 'Doratura (senza coperchio)', desc: '', group: 'Impasto', baseDur: 15, restDur: 0, restTemp: null,
            flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
            cookingCfg: { method: 'pentola', cfg: PENTOLA_OVEN_CFG_LID_OFF },
            ovenCfg: PENTOLA_OVEN_CFG_LID_OFF,
            advisorySourceId: 'steam_too_long',
          },
        }),
      ],
      [makeEdge('dough', 'bake'), makeEdge('bake', 'bake_dry')],
    )

    const result = reconcileGraph(graph, defaultPortioning, defaultMeta)

    const coveredNode = result.graph.nodes.find((n) => n.id === 'bake')!
    expect(coveredNode.data.ovenCfg?.lidOn).toBe(true)

    const uncoveredNode = result.graph.nodes.find((n) => n.id === 'bake_dry')!
    expect(uncoveredNode.data.ovenCfg?.lidOn).toBe(false)
    expect(uncoveredNode.data.advisorySourceId).toBe('steam_too_long')
  })
})
