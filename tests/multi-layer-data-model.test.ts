import { describe, it, expect } from 'vitest'
import {
  LAYER_TYPE_META,
  LAYER_TYPES,
  getDefaultMasterConfig,
} from '@commons/constants/layer-defaults'
import type { LayerType } from '@commons/types/recipe-layers'
import {
  makeLayer,
  makeCrossEdge,
  makeRecipeV3,
  makeNode,
  makeEdge,
} from './synthetic_data/helpers'

// ── LAYER_TYPE_META ─────────────────────────────────────────────

describe('LAYER_TYPE_META', () => {
  it('has metadata for all 5 layer types', () => {
    for (const lt of LAYER_TYPES) {
      expect(LAYER_TYPE_META[lt]).toBeDefined()
    }
  })

  it('each entry has icon, defaultColor, labelKey, descriptionKey', () => {
    for (const lt of LAYER_TYPES) {
      const meta = LAYER_TYPE_META[lt]
      expect(typeof meta.icon).toBe('string')
      expect(meta.icon.length).toBeGreaterThan(0)
      expect(typeof meta.defaultColor).toBe('string')
      expect(meta.defaultColor).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(typeof meta.labelKey).toBe('string')
      expect(meta.labelKey).toContain('layer_type_')
      expect(typeof meta.descriptionKey).toBe('string')
      expect(meta.descriptionKey).toContain('layer_type_')
    }
  })

  it('each layer type has a unique color', () => {
    const colors = LAYER_TYPES.map((lt) => LAYER_TYPE_META[lt].defaultColor)
    expect(new Set(colors).size).toBe(LAYER_TYPES.length)
  })
})

// ── LAYER_TYPES ─────────────────────────────────────────────────

describe('LAYER_TYPES', () => {
  it('contains exactly 5 types', () => {
    expect(LAYER_TYPES).toHaveLength(5)
  })

  it('includes all expected types', () => {
    const expected: LayerType[] = ['impasto', 'sauce', 'prep', 'ferment', 'pastry']
    for (const lt of expected) {
      expect(LAYER_TYPES).toContain(lt)
    }
  })
})

// ── getDefaultMasterConfig ──────────────────────────────────────

describe('getDefaultMasterConfig()', () => {
  it('returns a config for each layer type', () => {
    for (const lt of LAYER_TYPES) {
      const cfg = getDefaultMasterConfig(lt)
      expect(cfg).toBeDefined()
      expect(cfg.type).toBe(lt)
    }
  })

  it('impasto default has portioning fields', () => {
    const cfg = getDefaultMasterConfig('impasto')
    expect(cfg.type).toBe('impasto')
    expect(cfg.config).toHaveProperty('mode')
    expect(cfg.config).toHaveProperty('targetHyd')
    expect(cfg.config).toHaveProperty('ball')
  })

  it('sauce default has sauce-specific fields', () => {
    const cfg = getDefaultMasterConfig('sauce')
    expect(cfg.type).toBe('sauce')
    expect(cfg.config).toHaveProperty('sauceType')
    expect(cfg.config).toHaveProperty('targetVolume')
    expect(cfg.config).toHaveProperty('targetConsistency')
  })

  it('prep default has prep-specific fields', () => {
    const cfg = getDefaultMasterConfig('prep')
    expect(cfg.type).toBe('prep')
    expect(cfg.config).toHaveProperty('prepType')
    expect(cfg.config).toHaveProperty('servings')
  })

  it('ferment default has ferment-specific fields', () => {
    const cfg = getDefaultMasterConfig('ferment')
    expect(cfg.type).toBe('ferment')
    expect(cfg.config).toHaveProperty('fermentType')
    expect(cfg.config).toHaveProperty('saltPercentage')
    expect(cfg.config).toHaveProperty('targetPH')
  })

  it('pastry default has pastry-specific fields', () => {
    const cfg = getDefaultMasterConfig('pastry')
    expect(cfg.type).toBe('pastry')
    expect(cfg.config).toHaveProperty('pastryType')
    expect(cfg.config).toHaveProperty('targetWeight')
    expect(cfg.config).toHaveProperty('servings')
  })

  it('returns a new object each call (deep copy)', () => {
    const a = getDefaultMasterConfig('impasto')
    const b = getDefaultMasterConfig('impasto')
    expect(a).toEqual(b)
    expect(a).not.toBe(b)
    expect(a.config).not.toBe(b.config)
  })
})

// ── makeLayer helper ────────────────────────────────────────────

describe('makeLayer()', () => {
  it('creates a layer with required fields', () => {
    const layer = makeLayer({ id: 'l1', type: 'impasto' })
    expect(layer.id).toBe('l1')
    expect(layer.type).toBe('impasto')
    expect(layer.visible).toBe(true)
    expect(layer.locked).toBe(false)
    expect(layer.nodes).toEqual([])
    expect(layer.edges).toEqual([])
    expect(layer.lanes).toHaveLength(1)
  })

  it('allows overriding defaults', () => {
    const layer = makeLayer({
      id: 'l2',
      type: 'sauce',
      name: 'My Sauce',
      visible: false,
      locked: true,
      color: '#FF0000',
    })
    expect(layer.name).toBe('My Sauce')
    expect(layer.visible).toBe(false)
    expect(layer.locked).toBe(true)
    expect(layer.color).toBe('#FF0000')
  })

  it('sets appropriate masterConfig for each layer type', () => {
    for (const lt of LAYER_TYPES) {
      const layer = makeLayer({ id: `l_${lt}`, type: lt })
      expect(layer.masterConfig.type).toBe(lt)
    }
  })
})

// ── CrossLayerEdge via makeCrossEdge ────────────────────────────

describe('makeCrossEdge()', () => {
  it('creates edge with correct source/target references', () => {
    const edge = makeCrossEdge('layer_a', 'node_1', 'layer_b', 'node_2')
    expect(edge.sourceLayerId).toBe('layer_a')
    expect(edge.sourceNodeId).toBe('node_1')
    expect(edge.targetLayerId).toBe('layer_b')
    expect(edge.targetNodeId).toBe('node_2')
  })

  it('generates a deterministic id', () => {
    const edge = makeCrossEdge('la', 'n1', 'lb', 'n2')
    expect(edge.id).toBe('xedge_la_n1__lb_n2')
  })

  it('has default schedule ratios of 1', () => {
    const edge = makeCrossEdge('la', 'n1', 'lb', 'n2')
    expect(edge.data.scheduleTimeRatio).toBe(1)
    expect(edge.data.scheduleQtyRatio).toBe(1)
  })

  it('accepts overrides', () => {
    const edge = makeCrossEdge('la', 'n1', 'lb', 'n2', {
      label: 'timing',
      data: { scheduleTimeRatio: 0.5, scheduleQtyRatio: 0.75 },
    })
    expect(edge.label).toBe('timing')
    expect(edge.data.scheduleTimeRatio).toBe(0.5)
    expect(edge.data.scheduleQtyRatio).toBe(0.75)
  })
})

// ── RecipeV3 structure via makeRecipeV3 ─────────────────────────

describe('RecipeV3 structure (makeRecipeV3)', () => {
  it('creates a valid v3 recipe with one layer', () => {
    const layer = makeLayer({ id: 'l1', type: 'impasto' })
    const v3 = makeRecipeV3([layer])

    expect(v3.version).toBe(3)
    expect(v3.layers).toHaveLength(1)
    expect(v3.crossEdges).toEqual([])
    expect(v3.meta).toBeDefined()
    expect(v3.ingredientGroups).toEqual(['Impasto'])
  })

  it('supports multiple layers', () => {
    const layers = [
      makeLayer({ id: 'l1', type: 'impasto', position: 0 }),
      makeLayer({ id: 'l2', type: 'sauce', position: 1 }),
      makeLayer({ id: 'l3', type: 'prep', position: 2 }),
    ]
    const v3 = makeRecipeV3(layers)

    expect(v3.layers).toHaveLength(3)
    expect(v3.layers.map((l) => l.type)).toEqual(['impasto', 'sauce', 'prep'])
  })

  it('supports cross-layer edges', () => {
    const layers = [
      makeLayer({
        id: 'l1',
        type: 'impasto',
        nodes: [makeNode({ id: 'n1', type: 'done' })],
      }),
      makeLayer({
        id: 'l2',
        type: 'sauce',
        nodes: [makeNode({ id: 'n2', type: 'ingredient' })],
      }),
    ]
    const crossEdges = [makeCrossEdge('l1', 'n1', 'l2', 'n2')]
    const v3 = makeRecipeV3(layers, crossEdges)

    expect(v3.crossEdges).toHaveLength(1)
    expect(v3.crossEdges[0].sourceLayerId).toBe('l1')
    expect(v3.crossEdges[0].targetLayerId).toBe('l2')
  })

  it('layers can contain nodes and edges independently', () => {
    const impastoNodes = [
      makeNode({ id: 'a', type: 'dough' }),
      makeNode({ id: 'b', type: 'rise' }),
    ]
    const impastoEdges = [makeEdge('a', 'b')]
    const sauceNodes = [
      makeNode({ id: 'c', type: 'ingredient' }),
      makeNode({ id: 'd', type: 'cook' }),
    ]
    const sauceEdges = [makeEdge('c', 'd')]

    const layers = [
      makeLayer({ id: 'l1', type: 'impasto', nodes: impastoNodes, edges: impastoEdges }),
      makeLayer({ id: 'l2', type: 'sauce', nodes: sauceNodes, edges: sauceEdges }),
    ]
    const v3 = makeRecipeV3(layers)

    expect(v3.layers[0].nodes).toHaveLength(2)
    expect(v3.layers[0].edges).toHaveLength(1)
    expect(v3.layers[1].nodes).toHaveLength(2)
    expect(v3.layers[1].edges).toHaveLength(1)
  })
})
