import { describe, it, expect } from 'vitest'
import { migrateRecipeV1toV2, isRecipeV1, ensureRecipeV2 } from '@commons/utils/recipe-migration'
import { getStepTotalWeight } from '@commons/utils/recipe'
import { makeStep, makeDep, makeRecipe } from './synthetic_data/helpers'
import { SHOKUPAN_STEPS } from './synthetic_data/base_shokupan'
import { BIGA_80_STEPS } from './synthetic_data/base_biga_bread'

// ── Helper: sum all ingredient weights from a v2 graph ──────────
function graphTotalWeight(graph: { nodes: Array<{ data: { flours: { g: number }[]; liquids: { g: number }[]; extras: { g: number }[]; yeasts: { g: number }[]; salts: { g: number }[]; sugars: { g: number }[]; fats: { g: number }[] } }> }) {
  let total = 0
  for (const n of graph.nodes) {
    const d = n.data
    total += d.flours.reduce((s, f) => s + f.g, 0)
    total += d.liquids.reduce((s, l) => s + l.g, 0)
    total += d.extras.reduce((s, e) => s + e.g, 0)
    total += d.yeasts.reduce((s, y) => s + y.g, 0)
    total += d.salts.reduce((s, x) => s + x.g, 0)
    total += d.sugars.reduce((s, x) => s + x.g, 0)
    total += d.fats.reduce((s, x) => s + x.g, 0)
  }
  return total
}

describe('migrateRecipeV1toV2()', () => {
  it('produces correct number of nodes and edges', () => {
    const steps = [
      makeStep({ id: 'a', type: 'dough' }),
      makeStep({ id: 'b', type: 'rise', deps: [makeDep('a')] }),
      makeStep({ id: 'c', type: 'bake', deps: [makeDep('b')] }),
      makeStep({ id: 'd', type: 'done', deps: [makeDep('c')] }),
    ]
    const v2 = migrateRecipeV1toV2(makeRecipe(steps))

    expect(v2.version).toBe(2)
    expect(v2.graph.nodes).toHaveLength(4)
    expect(v2.graph.edges).toHaveLength(3)
    expect(v2.graph.lanes).toHaveLength(1)
    expect(v2.graph.lanes[0].id).toBe('main')
    expect(v2.graph.lanes[0].isMain).toBe(true)
  })

  it('preserves node types and subtypes', () => {
    const steps = [
      makeStep({ id: 'a', type: 'pre_ferment', subtype: 'biga' }),
      makeStep({ id: 'b', type: 'dough', subtype: 'hand', deps: [makeDep('a')] }),
    ]
    const v2 = migrateRecipeV1toV2(makeRecipe(steps))

    expect(v2.graph.nodes[0].type).toBe('pre_ferment')
    expect(v2.graph.nodes[0].subtype).toBe('biga')
    expect(v2.graph.nodes[1].type).toBe('dough')
    expect(v2.graph.nodes[1].subtype).toBe('hand')
  })

  it('maps deps to edges with correct scheduleTimeRatio and portion', () => {
    const steps = [
      makeStep({ id: 'a', type: 'dough' }),
      makeStep({ id: 'b', type: 'rise', deps: [{ id: 'a', wait: 0.75, grams: 0.5 }] }),
    ]
    const v2 = migrateRecipeV1toV2(makeRecipe(steps))

    expect(v2.graph.edges).toHaveLength(1)
    expect(v2.graph.edges[0].source).toBe('a')
    expect(v2.graph.edges[0].target).toBe('b')
    expect(v2.graph.edges[0].data.scheduleTimeRatio).toBe(0.75)
    expect(v2.graph.edges[0].data.scheduleQtyRatio).toBe(0.5)
  })

  it('preserves all ingredient types (flours, liquids, extras, yeasts, salts, sugars, fats)', () => {
    const steps = [
      makeStep({
        id: 'a',
        type: 'dough',
        flours: [{ id: 0, type: 'gt_00', g: 500, temp: null }],
        liquids: [{ id: 0, type: 'Acqua', g: 300, temp: null }],
        extras: [{ id: 0, name: 'Malto', g: 2 }],
        yeasts: [{ id: 0, type: 'fresh', g: 3 }],
        salts: [{ id: 0, type: 'sale_fino', g: 10 }],
        sugars: [{ id: 0, type: 'zucchero', g: 5 }],
        fats: [{ id: 0, type: 'olio_evo', g: 20 }],
      }),
    ]
    const v2 = migrateRecipeV1toV2(makeRecipe(steps))
    const d = v2.graph.nodes[0].data

    expect(d.flours).toHaveLength(1)
    expect(d.flours[0].g).toBe(500)
    expect(d.liquids).toHaveLength(1)
    expect(d.liquids[0].g).toBe(300)
    expect(d.extras).toHaveLength(1)
    expect(d.extras[0].name).toBe('Malto')
    expect(d.yeasts).toHaveLength(1)
    expect(d.yeasts[0].g).toBe(3)
    expect(d.salts).toHaveLength(1)
    expect(d.salts[0].g).toBe(10)
    expect(d.sugars).toHaveLength(1)
    expect(d.sugars[0].g).toBe(5)
    expect(d.fats).toHaveLength(1)
    expect(d.fats[0].g).toBe(20)
  })

  it('preserves ovenCfg and preFermentCfg', () => {
    const steps = [
      makeStep({
        id: 'a',
        type: 'bake',
        ovenCfg: { panType: 'alu', ovenType: 'electric', ovenMode: 'static', temp: 250, cieloPct: 40, shelfPosition: 2 },
      }),
      makeStep({
        id: 'b',
        type: 'pre_ferment',
        preFermentCfg: { preFermentPct: 45, hydrationPct: 44, yeastType: 'fresh', yeastPct: 1, fermentTemp: 18, fermentDur: 1080, roomTempDur: null, starterForm: null },
      }),
    ]
    const v2 = migrateRecipeV1toV2(makeRecipe(steps))

    expect(v2.graph.nodes[0].data.ovenCfg?.temp).toBe(250)
    expect(v2.graph.nodes[0].data.ovenCfg?.panType).toBe('alu')
    expect(v2.graph.nodes[1].data.preFermentCfg?.preFermentPct).toBe(45)
  })

  it('preserves meta and portioning', () => {
    const recipe = makeRecipe([makeStep({ id: 'a', type: 'dough' })])
    recipe.meta.name = 'Ciabatta'
    recipe.portioning.targetHyd = 80
    const v2 = migrateRecipeV1toV2(recipe)

    expect(v2.meta.name).toBe('Ciabatta')
    expect(v2.portioning.targetHyd).toBe(80)
    expect(v2.ingredientGroups).toEqual(['Impasto'])
  })

  it('total weight is preserved after migration (Shokupan)', () => {
    const v1Total = SHOKUPAN_STEPS.reduce((s, st) => s + getStepTotalWeight(st), 0)
    const recipe = makeRecipe(SHOKUPAN_STEPS)
    const v2 = migrateRecipeV1toV2(recipe)
    const v2Total = graphTotalWeight(v2.graph)

    expect(v2Total).toBeCloseTo(v1Total, 0)
  })

  it('total weight is preserved after migration (Biga 80%)', () => {
    const v1Total = BIGA_80_STEPS.reduce((s, st) => s + getStepTotalWeight(st), 0)
    const recipe = makeRecipe(BIGA_80_STEPS)
    const v2 = migrateRecipeV1toV2(recipe)
    const v2Total = graphTotalWeight(v2.graph)

    expect(v2Total).toBeCloseTo(v1Total, 0)
  })

  it('all nodes get lane "main"', () => {
    const steps = [
      makeStep({ id: 'a', type: 'dough' }),
      makeStep({ id: 'b', type: 'rise', deps: [makeDep('a')] }),
    ]
    const v2 = migrateRecipeV1toV2(makeRecipe(steps))

    for (const node of v2.graph.nodes) {
      expect(node.lane).toBe('main')
    }
  })

  it('handles steps with multiple deps', () => {
    const steps = [
      makeStep({ id: 'a', type: 'pre_ferment' }),
      makeStep({ id: 'b', type: 'pre_dough' }),
      makeStep({ id: 'c', type: 'dough', deps: [makeDep('a'), makeDep('b')] }),
    ]
    const v2 = migrateRecipeV1toV2(makeRecipe(steps))

    expect(v2.graph.edges).toHaveLength(2)
    expect(v2.graph.edges.map(e => e.source).sort()).toEqual(['a', 'b'])
    expect(v2.graph.edges.every(e => e.target === 'c')).toBe(true)
  })
})

describe('isRecipeV1()', () => {
  it('returns true for v1 recipe', () => {
    const r = makeRecipe([makeStep({ id: 'a', type: 'dough' })])
    expect(isRecipeV1(r)).toBe(true)
  })

  it('returns false for v2 recipe', () => {
    const v2 = migrateRecipeV1toV2(makeRecipe([makeStep({ id: 'a', type: 'dough' })]))
    expect(isRecipeV1(v2)).toBe(false)
  })
})

describe('ensureRecipeV2()', () => {
  it('migrates v1 to v2', () => {
    const r = makeRecipe([makeStep({ id: 'a', type: 'dough' })])
    const v2 = ensureRecipeV2(r)
    expect(v2.version).toBe(2)
    expect(v2.graph.nodes).toHaveLength(1)
  })

  it('returns v2 unchanged', () => {
    const v2 = migrateRecipeV1toV2(makeRecipe([makeStep({ id: 'a', type: 'dough' })]))
    const result = ensureRecipeV2(v2)
    expect(result).toBe(v2)
  })
})
