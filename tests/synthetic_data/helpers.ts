import type { RecipeStep, Recipe, StepDep, PreFermentConfig } from '@commons/types/recipe'
import type { RecipeNode, RecipeEdge, RecipeGraph, RecipeV2, NodeData, NodeTypeKey, RecipeEdgeData } from '@commons/types/recipe-graph'

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
    meta: { name: 'Test', author: 'Test', type: 'pane', subtype: 'pane_comune' },
    portioning: {
      mode: 'ball',
      tray: { preset: 't', l: 29, w: 8.5, h: 9, material: 'ci_lid', griglia: false, count: 1 },
      ball: { weight: 500, count: 2 },
      thickness: 0.6,
      targetHyd: 65,
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
    meta: { name: 'Test', author: 'Test', type: 'pane', subtype: 'pane_comune' },
    portioning: {
      mode: 'ball',
      tray: { preset: 't', l: 29, w: 8.5, h: 9, material: 'ci_lid', griglia: false, count: 1 },
      ball: { weight: 500, count: 2 },
      thickness: 0.6,
      targetHyd: 65,
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
