import { describe, it, expect } from 'vitest'
import {
  LAYER_PALETTES,
  isNodeTypeAllowed,
  getAllowedNodeTypes,
} from '@commons/constants/layer-palettes'
import type { LayerType } from '@commons/types/recipe-layers'

const ALL_LAYER_TYPES: LayerType[] = ['impasto', 'sauce', 'prep', 'ferment', 'pastry']

// ── LAYER_PALETTES structure ────────────────────────────────────

describe('LAYER_PALETTES', () => {
  it('has entries for all 5 layer types', () => {
    for (const lt of ALL_LAYER_TYPES) {
      expect(LAYER_PALETTES[lt]).toBeDefined()
      expect(LAYER_PALETTES[lt].size).toBeGreaterThan(0)
    }
  })

  it('each palette value is a Set', () => {
    for (const lt of ALL_LAYER_TYPES) {
      expect(LAYER_PALETTES[lt]).toBeInstanceOf(Set)
    }
  })
})

// ── Shared nodes ────────────────────────────────────────────────

describe('shared nodes across layer types', () => {
  it('"rest" is allowed in all 5 layer types', () => {
    for (const lt of ALL_LAYER_TYPES) {
      expect(isNodeTypeAllowed(lt, 'rest')).toBe(true)
    }
  })

  it('"ingredient" is allowed in sauce, prep, ferment, pastry', () => {
    expect(isNodeTypeAllowed('sauce', 'ingredient')).toBe(true)
    expect(isNodeTypeAllowed('prep', 'ingredient')).toBe(true)
    expect(isNodeTypeAllowed('ferment', 'ingredient')).toBe(true)
    expect(isNodeTypeAllowed('pastry', 'ingredient')).toBe(true)
  })

  it('"cook" is allowed in sauce, prep, pastry', () => {
    expect(isNodeTypeAllowed('sauce', 'cook')).toBe(true)
    expect(isNodeTypeAllowed('prep', 'cook')).toBe(true)
    expect(isNodeTypeAllowed('pastry', 'cook')).toBe(true)
  })
})

// ── Impasto layer ───────────────────────────────────────────────

describe('impasto layer palette', () => {
  it('allows dough-specific nodes', () => {
    const expected = ['pre_dough', 'pre_ferment', 'dough', 'rise', 'shape', 'bake', 'done']
    for (const nt of expected) {
      expect(isNodeTypeAllowed('impasto', nt as any)).toBe(true)
    }
  })

  it('allows split and join', () => {
    expect(isNodeTypeAllowed('impasto', 'split')).toBe(true)
    expect(isNodeTypeAllowed('impasto', 'join')).toBe(true)
  })

  it('rejects sauce-specific nodes', () => {
    expect(isNodeTypeAllowed('impasto', 'blend')).toBe(false)
    expect(isNodeTypeAllowed('impasto', 'emulsify')).toBe(false)
    expect(isNodeTypeAllowed('impasto', 'strain')).toBe(false)
  })
})

// ── Sauce layer ─────────────────────────────────────────────────

describe('sauce layer palette', () => {
  it('allows sauce-specific nodes', () => {
    const expected = ['ingredient', 'cook', 'blend', 'emulsify', 'strain', 'season']
    for (const nt of expected) {
      expect(isNodeTypeAllowed('sauce', nt as any)).toBe(true)
    }
  })

  it('rejects dough-specific nodes', () => {
    expect(isNodeTypeAllowed('sauce', 'dough')).toBe(false)
    expect(isNodeTypeAllowed('sauce', 'rise')).toBe(false)
    expect(isNodeTypeAllowed('sauce', 'bake')).toBe(false)
  })
})

// ── Prep layer ──────────────────────────────────────────────────

describe('prep layer palette', () => {
  it('allows prep-specific nodes', () => {
    const expected = ['wash', 'cut', 'peel', 'grate', 'mix', 'stuff', 'assemble', 'plate', 'garnish']
    for (const nt of expected) {
      expect(isNodeTypeAllowed('prep', nt as any)).toBe(true)
    }
  })

  it('rejects ferment-specific nodes', () => {
    expect(isNodeTypeAllowed('prep', 'brine')).toBe(false)
    expect(isNodeTypeAllowed('prep', 'inoculate')).toBe(false)
    expect(isNodeTypeAllowed('prep', 'ferment_node')).toBe(false)
  })
})

// ── Ferment layer ───────────────────────────────────────────────

describe('ferment layer palette', () => {
  it('allows ferment-specific nodes', () => {
    const expected = ['brine', 'inoculate', 'ferment_node', 'check', 'store']
    for (const nt of expected) {
      expect(isNodeTypeAllowed('ferment', nt as any)).toBe(true)
    }
  })

  it('rejects pastry-specific nodes', () => {
    expect(isNodeTypeAllowed('ferment', 'whip')).toBe(false)
    expect(isNodeTypeAllowed('ferment', 'temper')).toBe(false)
    expect(isNodeTypeAllowed('ferment', 'glaze')).toBe(false)
  })
})

// ── Pastry layer ────────────────────────────────────────────────

describe('pastry layer palette', () => {
  it('allows pastry-specific nodes', () => {
    const expected = ['whip', 'temper', 'fold', 'chill', 'mold', 'glaze']
    for (const nt of expected) {
      expect(isNodeTypeAllowed('pastry', nt as any)).toBe(true)
    }
  })

  it('rejects dough-specific nodes', () => {
    expect(isNodeTypeAllowed('pastry', 'dough')).toBe(false)
    expect(isNodeTypeAllowed('pastry', 'rise')).toBe(false)
    expect(isNodeTypeAllowed('pastry', 'shape')).toBe(false)
  })
})

// ── getAllowedNodeTypes ─────────────────────────────────────────

describe('getAllowedNodeTypes()', () => {
  it('returns an array for each layer type', () => {
    for (const lt of ALL_LAYER_TYPES) {
      const result = getAllowedNodeTypes(lt)
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
    }
  })

  it('returns the same elements as the palette Set', () => {
    for (const lt of ALL_LAYER_TYPES) {
      const arr = getAllowedNodeTypes(lt)
      const set = LAYER_PALETTES[lt]
      expect(arr.length).toBe(set.size)
      for (const nt of arr) {
        expect(set.has(nt)).toBe(true)
      }
    }
  })
})
