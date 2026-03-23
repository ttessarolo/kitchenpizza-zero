import { describe, it, expect } from 'vitest'
import {
  getStepTotalWeight,
  getAncestorIds,
  getDescendantIds,
  getChildIds,
  validateDeps,
  topologicalSort,
  removeStepAndFixDeps,
} from '@commons/utils/recipe'
import { makeStep, makeDep } from './synthetic_data/helpers'
import { SHOKUPAN_STEPS } from './synthetic_data/base_shokupan'
import { BIGA_80_STEPS } from './synthetic_data/base_biga_bread'
import { BIGA_100_STEPS } from './synthetic_data/biga_100_percent'

describe('Graph: totalDough calculation', () => {
  it('Shokupan: correct total weight', () => {
    const total = SHOKUPAN_STEPS.reduce((s, st) => s + getStepTotalWeight(st), 0)
    // roux: 22.5 + 112 = 134.5
    // knead: 315 + 162 + 7.2 + 6.3 = 490.5
    expect(total).toBeCloseTo(625, 0)
  })

  it('Biga 80%: correct total weight', () => {
    const total = BIGA_80_STEPS.reduce((s, st) => s + getStepTotalWeight(st), 0)
    // biga: 555.5 + 244.5 + 5.5 = 805.5
    // knead: 50.5 + 149.5 + 20 = 220
    expect(total).toBeCloseTo(1025.5, 0)
  })

  it('Biga 100%: main dough has only salt', () => {
    const knead = BIGA_100_STEPS.find(s => s.id === 'knead')!
    expect(knead.flours).toHaveLength(0)
    expect(knead.liquids).toHaveLength(0)
    expect(knead.extras[0].name).toBe('Sale')
  })
})

describe('Graph: ancestor/descendant traversal', () => {
  it('Biga bread: knead ancestors include biga_prep and biga_ferment', () => {
    const ancestors = getAncestorIds('knead', BIGA_80_STEPS)
    expect(ancestors.has('biga_prep')).toBe(true)
    expect(ancestors.has('biga_ferment')).toBe(true)
  })

  it('Biga bread: biga_prep descendants include all steps', () => {
    const desc = getDescendantIds('biga_prep', BIGA_80_STEPS)
    expect(desc.has('biga_ferment')).toBe(true)
    expect(desc.has('knead')).toBe(true)
    expect(desc.has('done')).toBe(true)
  })

  it('Shokupan: done has all steps as ancestors', () => {
    const ancestors = getAncestorIds('done', SHOKUPAN_STEPS)
    expect(ancestors.size).toBe(3)
  })
})

describe('Graph: getChildIds', () => {
  it('biga_prep has biga_ferment as child', () => {
    expect(getChildIds('biga_prep', BIGA_80_STEPS)).toContain('biga_ferment')
  })

  it('done has no children', () => {
    expect(getChildIds('done', BIGA_80_STEPS)).toHaveLength(0)
  })
})

describe('Graph: dependency validation', () => {
  it('Shokupan graph is valid', () => {
    expect(validateDeps(SHOKUPAN_STEPS).valid).toBe(true)
  })

  it('Biga 80% graph is valid', () => {
    expect(validateDeps(BIGA_80_STEPS).valid).toBe(true)
  })

  it('Biga 100% graph is valid', () => {
    expect(validateDeps(BIGA_100_STEPS).valid).toBe(true)
  })

  it('detects unknown dep reference', () => {
    const bad = [makeStep({ id: 'a', type: 'dough', deps: [makeDep('nonexistent')] })]
    const result = validateDeps(bad)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('unknown'))).toBe(true)
  })
})

describe('Graph: topological sort', () => {
  it('maintains valid order for Biga recipe', () => {
    const shuffled = [...BIGA_80_STEPS].reverse()
    const sorted = topologicalSort(shuffled)
    const ids = sorted.map(s => s.id)
    expect(ids.indexOf('biga_prep')).toBeLessThan(ids.indexOf('biga_ferment'))
    expect(ids.indexOf('biga_ferment')).toBeLessThan(ids.indexOf('knead'))
    expect(ids.indexOf('knead')).toBeLessThan(ids.indexOf('done'))
  })
})

describe('Graph: removeStepAndFixDeps', () => {
  it('removing biga_ferment reconnects knead to biga_prep', () => {
    const result = removeStepAndFixDeps('biga_ferment', BIGA_80_STEPS)
    expect(result.find(s => s.id === 'biga_ferment')).toBeUndefined()
    const knead = result.find(s => s.id === 'knead')!
    expect(knead.deps.some(d => d.id === 'biga_prep')).toBe(true)
  })

  it('removing middle step preserves graph validity', () => {
    const result = removeStepAndFixDeps('knead', SHOKUPAN_STEPS)
    expect(validateDeps(result).valid).toBe(true)
  })
})

describe('Graph: drag constraints', () => {
  it('pre_ferment before dough in topological order', () => {
    const ids = BIGA_80_STEPS.map(s => s.id)
    expect(ids.indexOf('biga_prep')).toBeLessThan(ids.indexOf('knead'))
  })

  it('done is always last', () => {
    const done = BIGA_80_STEPS[BIGA_80_STEPS.length - 1]
    expect(done.type).toBe('done')
  })

  it('moving pre_ferment after dough creates invalid graph', () => {
    // Simulate: move biga_prep (index 0) to after knead (index 2)
    const reordered = [...BIGA_80_STEPS]
    const [moved] = reordered.splice(0, 1)
    reordered.splice(2, 0, moved)
    const result = validateDeps(reordered)
    expect(result.valid).toBe(false)
  })
})
