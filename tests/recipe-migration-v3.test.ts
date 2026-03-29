import { describe, it, expect } from 'vitest'
import {
  migrateRecipeV2toV3,
  isRecipeV3,
  ensureRecipeV3,
  migrateRecipeV1toV2,
} from '@commons/utils/recipe-migration'
import {
  makeStep,
  makeDep,
  makeRecipe,
  makeNode,
  makeEdge,
  makeGraph,
  makeRecipeV2,
  makeRecipeV3,
  makeLayer,
} from './synthetic_data/helpers'

// ── migrateRecipeV2toV3 ─────────────────────────────────────────

describe('migrateRecipeV2toV3()', () => {
  it('wraps v2 into a single impasto layer', () => {
    const nodes = [makeNode({ id: 'a', type: 'dough' })]
    const edges = [makeEdge('a', 'b')]
    const graph = makeGraph(nodes, edges)
    const v2 = makeRecipeV2(graph)

    const v3 = migrateRecipeV2toV3(v2)

    expect(v3.version).toBe(3)
    expect(v3.layers).toHaveLength(1)
    expect(v3.layers[0].type).toBe('impasto')
    expect(v3.layers[0].id).toBe('layer_impasto_0')
  })

  it('preserves nodes and edges in the layer', () => {
    const nodes = [
      makeNode({ id: 'a', type: 'dough' }),
      makeNode({ id: 'b', type: 'rise' }),
    ]
    const edges = [makeEdge('a', 'b')]
    const graph = makeGraph(nodes, edges)
    const v2 = makeRecipeV2(graph)

    const v3 = migrateRecipeV2toV3(v2)

    expect(v3.layers[0].nodes).toHaveLength(2)
    expect(v3.layers[0].edges).toHaveLength(1)
    expect(v3.layers[0].nodes[0].id).toBe('a')
    expect(v3.layers[0].nodes[1].id).toBe('b')
    expect(v3.layers[0].edges[0].source).toBe('a')
    expect(v3.layers[0].edges[0].target).toBe('b')
  })

  it('moves portioning into masterConfig', () => {
    const graph = makeGraph([], [])
    const v2 = makeRecipeV2(graph)

    const v3 = migrateRecipeV2toV3(v2)

    expect(v3.layers[0].masterConfig.type).toBe('impasto')
    expect(v3.layers[0].masterConfig.config).toBe(v2.portioning)
  })

  it('preserves meta at recipe level', () => {
    const graph = makeGraph([], [])
    const v2 = makeRecipeV2(graph)
    v2.meta.name = 'Focaccia Ligure'
    v2.meta.author = 'Chef Test'

    const v3 = migrateRecipeV2toV3(v2)

    expect(v3.meta.name).toBe('Focaccia Ligure')
    expect(v3.meta.author).toBe('Chef Test')
  })

  it('preserves ingredientGroups', () => {
    const graph = makeGraph([], [])
    const v2 = makeRecipeV2(graph, ['Impasto', 'Biga'])

    const v3 = migrateRecipeV2toV3(v2)

    expect(v3.ingredientGroups).toEqual(['Impasto', 'Biga'])
  })

  it('sets default layer properties (color, icon, position, visible, locked)', () => {
    const graph = makeGraph([], [])
    const v2 = makeRecipeV2(graph)

    const v3 = migrateRecipeV2toV3(v2)
    const layer = v3.layers[0]

    expect(layer.color).toBe('#F59E0B')
    expect(layer.icon).toBe('\u{1F35E}')
    expect(layer.position).toBe(0)
    expect(layer.visible).toBe(true)
    expect(layer.locked).toBe(false)
  })

  it('preserves lanes from the v2 graph', () => {
    const graph = makeGraph([], [])
    graph.lanes = [
      { id: 'main', label: 'Main', isMain: true, origin: { type: 'user' } },
      { id: 'secondary', label: 'Alt', isMain: false, origin: { type: 'user' } },
    ]
    const v2 = makeRecipeV2(graph)

    const v3 = migrateRecipeV2toV3(v2)

    expect(v3.layers[0].lanes).toHaveLength(2)
    expect(v3.layers[0].lanes[0].id).toBe('main')
    expect(v3.layers[0].lanes[1].id).toBe('secondary')
  })

  it('preserves viewport if present', () => {
    const graph = makeGraph([], [])
    graph.viewport = { x: 100, y: 200, zoom: 1.5 }
    const v2 = makeRecipeV2(graph)

    const v3 = migrateRecipeV2toV3(v2)

    expect(v3.layers[0].viewport).toEqual({ x: 100, y: 200, zoom: 1.5 })
  })

  it('initializes crossEdges as empty array', () => {
    const graph = makeGraph([], [])
    const v2 = makeRecipeV2(graph)

    const v3 = migrateRecipeV2toV3(v2)

    expect(v3.crossEdges).toEqual([])
  })

  it('uses recipe name as layer name', () => {
    const graph = makeGraph([], [])
    const v2 = makeRecipeV2(graph)
    v2.meta.name = 'Ciabatta'

    const v3 = migrateRecipeV2toV3(v2)

    expect(v3.layers[0].name).toBe('Ciabatta')
  })

  it('falls back to "Impasto" if meta.name is empty', () => {
    const graph = makeGraph([], [])
    const v2 = makeRecipeV2(graph)
    v2.meta.name = ''

    const v3 = migrateRecipeV2toV3(v2)

    expect(v3.layers[0].name).toBe('Impasto')
  })
})

// ── isRecipeV3 ──────────────────────────────────────────────────

describe('isRecipeV3()', () => {
  it('returns true for a v3 recipe', () => {
    const v3 = makeRecipeV3([makeLayer({ id: 'l1', type: 'impasto' })])
    expect(isRecipeV3(v3)).toBe(true)
  })

  it('returns false for a v2 recipe', () => {
    const v2 = makeRecipeV2(makeGraph([], []))
    expect(isRecipeV3(v2)).toBe(false)
  })

  it('returns false for a v1 recipe', () => {
    const v1 = makeRecipe([makeStep({ id: 'a', type: 'dough' })])
    expect(isRecipeV3(v1)).toBe(false)
  })

  it('returns false for null', () => {
    expect(isRecipeV3(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isRecipeV3(undefined)).toBe(false)
  })

  it('returns false for a non-object', () => {
    expect(isRecipeV3('not a recipe')).toBe(false)
    expect(isRecipeV3(42)).toBe(false)
  })

  it('returns false for object with version 3 but no layers', () => {
    expect(isRecipeV3({ version: 3 })).toBe(false)
  })

  it('returns false for object with layers but wrong version', () => {
    expect(isRecipeV3({ version: 2, layers: [] })).toBe(false)
  })
})

// ── ensureRecipeV3 ──────────────────────────────────────────────

describe('ensureRecipeV3()', () => {
  it('returns v3 unchanged (passthrough)', () => {
    const v3 = makeRecipeV3([makeLayer({ id: 'l1', type: 'impasto' })])
    const result = ensureRecipeV3(v3)
    expect(result).toBe(v3)
  })

  it('migrates v2 to v3', () => {
    const nodes = [makeNode({ id: 'a', type: 'dough' })]
    const graph = makeGraph(nodes, [])
    const v2 = makeRecipeV2(graph)

    const v3 = ensureRecipeV3(v2)

    expect(v3.version).toBe(3)
    expect(v3.layers).toHaveLength(1)
    expect(v3.layers[0].nodes).toHaveLength(1)
  })

  it('migrates v1 all the way to v3', () => {
    const steps = [
      makeStep({ id: 'a', type: 'dough' }),
      makeStep({ id: 'b', type: 'rise', deps: [makeDep('a')] }),
      makeStep({ id: 'c', type: 'bake', deps: [makeDep('b')] }),
    ]
    const v1 = makeRecipe(steps)

    const v3 = ensureRecipeV3(v1)

    expect(v3.version).toBe(3)
    expect(v3.layers).toHaveLength(1)
    expect(v3.layers[0].type).toBe('impasto')
    expect(v3.layers[0].nodes).toHaveLength(3)
    expect(v3.layers[0].edges).toHaveLength(2)
  })

  it('v1→v3 preserves meta', () => {
    const v1 = makeRecipe([makeStep({ id: 'a', type: 'dough' })])
    v1.meta.name = 'Pane Toscano'

    const v3 = ensureRecipeV3(v1)

    expect(v3.meta.name).toBe('Pane Toscano')
  })
})
