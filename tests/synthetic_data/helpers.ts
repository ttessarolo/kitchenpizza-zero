import type { RecipeStep, Recipe, StepDep, PreFermentConfig, CookingConfig, OvenConfig, Portioning, RecipeMeta } from '@commons/types/recipe'
import type { RecipeNode, RecipeEdge, RecipeGraph, RecipeV2, NodeTypeKey, RecipeEdgeData, NodeData } from '@commons/types/recipe-graph'

/** Create a minimal step with defaults */
export function makeStep(overrides: Partial<RecipeStep> & { id: string; type: string }): RecipeStep {
  return {
    title: '',
    subtype: null,
    group: 'Impasto',
    baseDur: 10,
    restDur: 0,
    restTemp: null,
    deps: [],
    kneadMethod: null,
    desc: '',
    flours: [],
    liquids: [],
    extras: [],
    yeasts: [],
    salts: [],
    sugars: [],
    fats: [],
    riseMethod: null,
    ovenCfg: null,
    sourcePrep: null,
    shapeCount: null,
    preFermentCfg: null,
    ...overrides,
  }
}

/** Create a minimal dep */
export function makeDep(id: string, wait = 1, grams = 1): StepDep {
  return { id, wait, grams }
}

/** Create a minimal recipe wrapping steps */
export function makeRecipe(steps: RecipeStep[], groups = ['Impasto']): Recipe {
  return {
    meta: { name: 'Test', author: 'Test', type: 'pane', subtype: 'pane_comune', locale: 'it' },
    portioning: {
      mode: 'ball',
      tray: { preset: 't', l: 29, w: 8.5, h: 9, material: 'ci_lid', griglia: false, count: 1 },
      ball: { weight: 500, count: 2 },
      thickness: 0.6,
      targetHyd: 65, doughHours: 18, yeastPct: 0.22, saltPct: 2.3, fatPct: 3, preImpasto: null, preFermento: null, flourMix: [], autoCorrect: false, reasoningLevel: 'medium',
    },
    ingredientGroups: groups,
    steps,
  }
}

// ── v2 Graph helpers ────────────────────────────────────────────

/** Create a minimal RecipeNode */
export function makeNode(overrides: Partial<RecipeNode> & { id: string; type: NodeTypeKey }): RecipeNode {
  return {
    subtype: null,
    position: { x: 0, y: 0 },
    lane: 'main',
    ...overrides,
    data: {
      title: '',
      desc: '',
      group: 'Impasto',
      baseDur: 10,
      restDur: 0,
      restTemp: null,
      flours: [],
      liquids: [],
      extras: [],
      yeasts: [],
      salts: [],
      sugars: [],
      fats: [],
      ...(overrides.data || {}),
    },
  }
}

/** Create a minimal RecipeEdge */
export function makeEdge(source: string, target: string, data?: Partial<RecipeEdgeData>): RecipeEdge {
  return {
    id: `e_${source}__${target}`,
    source,
    target,
    data: { scheduleTimeRatio: 1, scheduleQtyRatio: 1, ...data },
  }
}

/** Create a minimal RecipeGraph */
export function makeGraph(nodes: RecipeNode[], edges: RecipeEdge[]): RecipeGraph {
  return {
    nodes,
    edges,
    lanes: [{ id: 'main', label: 'Panificazione', isMain: true, origin: { type: 'user' } }],
  }
}

/** Create a minimal RecipeV2 wrapping a graph */
export function makeRecipeV2(graph: RecipeGraph, groups = ['Impasto']): RecipeV2 {
  return {
    version: 2,
    meta: { name: 'Test', author: 'Test', type: 'pane', subtype: 'pane_comune', locale: 'it' },
    portioning: {
      mode: 'ball',
      tray: { preset: 't', l: 29, w: 8.5, h: 9, material: 'ci_lid', griglia: false, count: 1 },
      ball: { weight: 500, count: 2 },
      thickness: 0.6,
      targetHyd: 65, doughHours: 18, yeastPct: 0.22, saltPct: 2.3, fatPct: 3, preImpasto: null, preFermento: null, flourMix: [], autoCorrect: false, reasoningLevel: 'medium',
    },
    ingredientGroups: groups,
    graph,
  }
}

/** Create a pre-ferment config */
export function makePfCfg(overrides: Partial<PreFermentConfig> = {}): PreFermentConfig {
  return {
    preFermentPct: 45,
    hydrationPct: 44,
    yeastType: 'fresh',
    yeastPct: 1,
    fermentTemp: 18,
    fermentDur: 1080,
    roomTempDur: null,
    starterForm: null,
    ...overrides,
  }
}

// ── Warning / Advisory test helpers ──────────────────────────────

/** Create a CookingConfig from a method name and arbitrary config fields */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function makeCookingCfg(method: string, cfg: any): CookingConfig {
  return { method, cfg } as CookingConfig
}

/** Create a default OvenConfig with optional overrides */
export function makeOvenCfg(overrides: Partial<OvenConfig> = {}): OvenConfig {
  return {
    panType: 'stone',
    ovenType: 'electric',
    ovenMode: 'static',
    temp: 250,
    cieloPct: 50,
    shelfPosition: 2,
    ...overrides,
  }
}

/** Create an empty NodeData suitable for bake warning tests */
export function makeEmptyNodeData(overrides: Partial<NodeData> = {}): NodeData {
  return {
    title: 'test', desc: '', group: 'Impasto', baseDur: 10, restDur: 0, restTemp: null,
    flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
    ...overrides,
  }
}

/** Create default portioning for reconciler tests */
export function makeDefaultPortioning(overrides: Partial<Portioning> = {}): Portioning {
  return {
    mode: 'ball',
    tray: { preset: 't', l: 40, w: 30, h: 2, material: 'alu', griglia: false, count: 1 },
    ball: { weight: 250, count: 4 },
    thickness: 0.5,
    targetHyd: 65,
    doughHours: 18,
    yeastPct: 0.22,
    saltPct: 2.3,
    fatPct: 3,
    preImpasto: null,
    preFermento: null,
    flourMix: [],
    autoCorrect: false,
    reasoningLevel: 'medium',
    ...overrides,
  }
}

/** Create default recipe meta for tests */
export function makeDefaultMeta(overrides: Partial<RecipeMeta> = {}): RecipeMeta {
  return { name: 'Test', author: '', type: 'pane', subtype: 'pane_comune', locale: 'it', ...overrides }
}

// ── Fermentation coherence test helpers ─────────────────────────

/** Create a rise node with method and duration */
export function makeRiseNode(id: string, baseDur: number, riseMethod = 'room', overrides: Partial<RecipeNode> = {}): RecipeNode {
  return makeNode({
    id,
    type: 'rise',
    ...overrides,
    data: {
      title: `Rise ${riseMethod}`,
      riseMethod,
      baseDur,
      ...(overrides.data || {}),
    },
  })
}

/** Create a dough node with flour and typical ingredients */
export function makeDoughNodeWithFlour(id: string, flourType = 'gt_00_deb', grams = 500): RecipeNode {
  return makeNode({
    id,
    type: 'dough',
    data: {
      title: 'Impasto',
      flours: [{ id: 1, type: flourType, g: grams, temp: null }],
      liquids: [{ id: 1, type: 'water', g: Math.round(grams * 0.65), temp: null }],
      yeasts: [{ id: 1, type: 'fresh', g: Math.round(grams * 0.0022 * 100) / 100 }],
      salts: [{ id: 1, type: 'sale', g: Math.round(grams * 0.023 * 100) / 100 }],
    },
  })
}
