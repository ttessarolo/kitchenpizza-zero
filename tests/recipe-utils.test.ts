import { describe, it, expect } from 'vitest'
import {
  rnd,
  computePreFermentAmounts,
  validatePreFerment,
  getStepTotalWeight,
  getAncestorIds,
  getDescendantIds,
  getChildIds,
  validateDeps,
  topologicalSort,
  removeStepAndFixDeps,
  cloneStep,
  migrateRecipe,
} from '@commons/utils/recipe'
import { makeStep, makeDep, makePfCfg } from './synthetic_data/helpers'
import { SHOKUPAN_STEPS } from './synthetic_data/base_shokupan'

describe('rnd()', () => {
  it('rounds >= 100 to integer', () => {
    expect(rnd(123.7)).toBe(124)
    expect(rnd(100.3)).toBe(100)
  })
  it('rounds >= 10 to 0.5', () => {
    expect(rnd(22.3)).toBe(22.5)
    expect(rnd(15.1)).toBe(15)
  })
  it('rounds < 10 to 0.1', () => {
    expect(rnd(5.55)).toBe(5.6)
    expect(rnd(0.123)).toBe(0.1)
  })
})

describe('computePreFermentAmounts()', () => {
  it('computes Biga 45% at 44% hydration on 1000g', () => {
    const pf = computePreFermentAmounts(1000, makePfCfg({ preFermentPct: 45, hydrationPct: 44, yeastPct: 1 }))
    expect(pf.pfWeight).toBe(450)
    // New formula: denominator includes yeast
    expect(pf.pfFlour).toBe(rnd(450 / (1 + 0.44 + 0.01)))
    expect(pf.pfWater).toBe(rnd(pf.pfFlour * 0.44))
    expect(pf.pfYeast).toBe(rnd(pf.pfFlour * 0.01))
    // Sum must equal pfWeight
    expect(pf.pfFlour + pf.pfWater + pf.pfYeast).toBeCloseTo(450, -1)
  })

  it('computes Poolish 40% at 100% hydration on 1000g', () => {
    const pf = computePreFermentAmounts(1000, makePfCfg({ preFermentPct: 40, hydrationPct: 100, yeastPct: 0.1 }))
    expect(pf.pfWeight).toBe(400)
    expect(pf.pfFlour).toBe(200)
    expect(pf.pfWater).toBe(200)
    expect(pf.pfYeast).toBe(0.2)
  })

  it('computes 100% pre-ferment — all dough is pre-ferment', () => {
    const pf = computePreFermentAmounts(1000, makePfCfg({ preFermentPct: 100, hydrationPct: 65, yeastPct: 1 }))
    expect(pf.pfWeight).toBe(1000)
    // Sum must equal pfWeight
    expect(pf.pfFlour + pf.pfWater + pf.pfYeast).toBeCloseTo(1000, -1)
  })

  it('returns 0 yeast when yeastPct is null', () => {
    const pf = computePreFermentAmounts(1000, makePfCfg({ preFermentPct: 25, hydrationPct: 50, yeastPct: null }))
    expect(pf.pfYeast).toBe(0)
  })
})

describe('validatePreFerment()', () => {
  it('accepts valid config', () => {
    const errors = validatePreFerment(makePfCfg({ preFermentPct: 45 }), 600, 400, 1000)
    expect(errors).toHaveLength(0)
  })

  it('rejects preFermentPct > 100', () => {
    const errors = validatePreFerment(makePfCfg({ preFermentPct: 101 }), 600, 400, 1000)
    expect(errors.some(e => e.includes('100%'))).toBe(true)
  })

  it('rejects preFermentPct <= 0', () => {
    const errors = validatePreFerment(makePfCfg({ preFermentPct: 0 }), 600, 400, 1000)
    expect(errors.some(e => e.includes('1%'))).toBe(true)
  })

  it('rejects hydration out of range', () => {
    const errors = validatePreFerment(makePfCfg({ hydrationPct: 35 }), 600, 400, 1000)
    expect(errors.some(e => e.includes('40%'))).toBe(true)
  })

  it('accepts 100% pre-ferment when flour matches total', () => {
    const errors = validatePreFerment(
      makePfCfg({ preFermentPct: 100, hydrationPct: 65 }),
      606, 394, 1000,
    )
    // Should NOT have flour/liquid overflow errors
    expect(errors.filter(e => e.includes('farina') || e.includes('liquidi'))).toHaveLength(0)
  })
})

describe('getStepTotalWeight()', () => {
  it('sums flours + liquids + extras + yeasts', () => {
    const step = makeStep({
      id: 'test', type: 'dough',
      flours: [{ id: 0, type: 'f', g: 100, temp: null }],
      liquids: [{ id: 0, type: 'l', g: 50, temp: null }],
      extras: [{ id: 0, name: 'salt', g: 5 }],
      yeasts: [{ id: 0, type: 'fresh', g: 3 }],
    })
    expect(getStepTotalWeight(step)).toBe(158)
  })

  it('excludes extras with unit', () => {
    const step = makeStep({
      id: 'test', type: 'dough',
      flours: [{ id: 0, type: 'f', g: 100, temp: null }],
      extras: [{ id: 0, name: 'egg', g: 1, unit: 'pz' }],
    })
    expect(getStepTotalWeight(step)).toBe(100)
  })
})

describe('getAncestorIds()', () => {
  it('finds all ancestors in Shokupan', () => {
    const ancestors = getAncestorIds('rise1', SHOKUPAN_STEPS)
    expect(ancestors.has('knead')).toBe(true)
    expect(ancestors.has('roux')).toBe(true)
    expect(ancestors.has('rise1')).toBe(false)
  })

  it('returns empty set for root step', () => {
    const ancestors = getAncestorIds('roux', SHOKUPAN_STEPS)
    expect(ancestors.size).toBe(0)
  })
})

describe('getDescendantIds()', () => {
  it('finds all descendants of roux in Shokupan', () => {
    const desc = getDescendantIds('roux', SHOKUPAN_STEPS)
    expect(desc.has('knead')).toBe(true)
    expect(desc.has('rise1')).toBe(true)
    expect(desc.has('done')).toBe(true)
    expect(desc.has('roux')).toBe(false)
  })
})

describe('getChildIds()', () => {
  it('finds direct children', () => {
    const children = getChildIds('knead', SHOKUPAN_STEPS)
    expect(children).toContain('rise1')
    expect(children).not.toContain('done')
  })
})

describe('validateDeps()', () => {
  it('validates a correct graph', () => {
    const result = validateDeps(SHOKUPAN_STEPS)
    expect(result.valid).toBe(true)
  })

  it('detects forward-reference', () => {
    const badSteps = [
      makeStep({ id: 'a', type: 'dough', deps: [makeDep('b')] }),
      makeStep({ id: 'b', type: 'rise' }),
    ]
    const result = validateDeps(badSteps)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('forward'))).toBe(true)
  })

  it('detects cycles', () => {
    const cyclic = [
      makeStep({ id: 'a', type: 'dough', deps: [makeDep('c')] }),
      makeStep({ id: 'b', type: 'rise', deps: [makeDep('a')] }),
      makeStep({ id: 'c', type: 'shape', deps: [makeDep('b')] }),
    ]
    const result = validateDeps(cyclic)
    expect(result.valid).toBe(false)
  })
})

describe('topologicalSort()', () => {
  it('sorts steps into valid order', () => {
    const shuffled = [SHOKUPAN_STEPS[2], SHOKUPAN_STEPS[0], SHOKUPAN_STEPS[3], SHOKUPAN_STEPS[1]]
    const sorted = topologicalSort(shuffled)
    const ids = sorted.map(s => s.id)
    expect(ids.indexOf('roux')).toBeLessThan(ids.indexOf('knead'))
    expect(ids.indexOf('knead')).toBeLessThan(ids.indexOf('rise1'))
    expect(ids.indexOf('rise1')).toBeLessThan(ids.indexOf('done'))
  })
})

describe('removeStepAndFixDeps()', () => {
  it('reconnects children to parents of removed step', () => {
    const result = removeStepAndFixDeps('knead', SHOKUPAN_STEPS)
    expect(result.find(s => s.id === 'knead')).toBeUndefined()
    const rise = result.find(s => s.id === 'rise1')!
    expect(rise.deps.some(d => d.id === 'roux')).toBe(true)
  })
})

describe('cloneStep()', () => {
  it('deep clones with new id', () => {
    const original = SHOKUPAN_STEPS[1]
    const clone = cloneStep(original, 'knead_copy')
    expect(clone.id).toBe('knead_copy')
    expect(clone.flours).toEqual(original.flours)
    clone.flours[0].g = 999
    expect(original.flours[0].g).toBe(315) // Not mutated
  })
})

describe('migrateRecipe()', () => {
  it('adds missing fields', () => {
    const raw = {
      meta: { name: 'T', author: 'T', type: 'pane', subtype: 'p' },
      portioning: { mode: 'ball' as const, tray: { preset: 't', l: 1, w: 1, h: 1, material: 'm', griglia: false, count: 1 }, ball: { weight: 250, count: 2 }, thickness: 0.6, targetHyd: 65 },
      ingredientGroups: ['Impasto'],
      steps: [{
        id: 'a', title: 'A', type: 'dough', group: 'Impasto', baseDur: 10,
        deps: [{ id: 'x', wait: 0.5 }], kneadMethod: null, desc: '',
        flours: [], liquids: [], extras: [], yeasts: [],
        riseMethod: null, ovenCfg: null, sourcePrep: null,
      }],
    }
    // @ts-expect-error — raw is intentionally missing new fields
    const migrated = migrateRecipe(raw)
    const step = migrated.steps[0]
    expect(step.deps[0].grams).toBe(1)
    expect(step.subtype).toBeNull()
    expect(step.restDur).toBe(0)
    expect(step.restTemp).toBeNull()
    expect(step.shapeCount).toBeNull()
    expect(step.preFermentCfg).toBeNull()
  })
})
