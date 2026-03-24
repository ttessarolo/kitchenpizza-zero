import { describe, it, expect } from 'vitest'
import {
  computeGraphTotals,
  computeGroupedIngredients,
  computeSchedule,
  computeTimeSummary,
} from '~/hooks/useGraphCalculator'
import { migrateRecipeV1toV2 } from '@commons/utils/recipe-migration'
import { getStepTotalWeight } from '@commons/utils/recipe'
import { makeRecipe } from './synthetic_data/helpers'
import { SHOKUPAN_STEPS } from './synthetic_data/base_shokupan'
import { BIGA_80_STEPS } from './synthetic_data/base_biga_bread'
import { MARGHERITA_GRAPH } from './synthetic_data/pizza_margherita_graph'
import { PANE_BICOLORE_GRAPH } from './synthetic_data/pane_bicolore_graph'

describe('computeGraphTotals()', () => {
  it('matches v1 totals after migration (Shokupan)', () => {
    const v1Total = SHOKUPAN_STEPS.reduce((s, st) => s + getStepTotalWeight(st), 0)
    const v2 = migrateRecipeV1toV2(makeRecipe(SHOKUPAN_STEPS))
    const totals = computeGraphTotals(v2.graph)

    expect(totals.totalDough).toBeCloseTo(v1Total, 0)
  })

  it('matches v1 totals after migration (Biga 80%)', () => {
    const v1Total = BIGA_80_STEPS.reduce((s, st) => s + getStepTotalWeight(st), 0)
    const v2 = migrateRecipeV1toV2(makeRecipe(BIGA_80_STEPS))
    const totals = computeGraphTotals(v2.graph)

    expect(totals.totalDough).toBeCloseTo(v1Total, 0)
  })

  it('excludes prep nodes from totalDough (Margherita)', () => {
    const totals = computeGraphTotals(MARGHERITA_GRAPH)

    // Main dough: flour 500 + water 325 + yeast 3 + salt 10 + oil 15 = 853
    expect(totals.totalFlour).toBe(500)
    expect(totals.totalLiquid).toBe(325)
    expect(totals.totalDough).toBe(853)
    // Prep ingredients (pomodori 400, aglio 5, sale 3, olio 15) NOT in totalDough
  })

  it('includes all dough node types in totals (bicolore with split/join)', () => {
    const totals = computeGraphTotals(PANE_BICOLORE_GRAPH)

    // Dough node: flour 600 + water 360 + yeast 6 + salt 12 + oil 22 = 1000
    // Cocoa prep node (type=prep) contributes extras but prep is excluded
    // So totalDough = 1000
    expect(totals.totalFlour).toBe(600)
    expect(totals.totalDough).toBe(1000)
  })

  it('computes hydration correctly', () => {
    const totals = computeGraphTotals(MARGHERITA_GRAPH)
    expect(totals.currentHydration).toBe(65) // 325/500 = 65%
  })
})

describe('computeGroupedIngredients()', () => {
  it('aggregates across all nodes in group', () => {
    const v2 = migrateRecipeV1toV2(makeRecipe(SHOKUPAN_STEPS))
    const grouped = computeGroupedIngredients(v2.graph, v2.ingredientGroups)

    expect(grouped['Impasto']).toBeDefined()
    expect(grouped['Impasto'].flours.length).toBeGreaterThan(0)
  })

  it('includes prep node ingredients in grouped totals', () => {
    const grouped = computeGroupedIngredients(MARGHERITA_GRAPH, ['Impasto'])

    // Prep nodes are in group "Impasto" so their ingredients should appear
    const extras = grouped['Impasto'].extras
    expect(extras.some((e) => e.name === 'Pomodori San Marzano')).toBe(true)
  })
})

describe('computeSchedule()', () => {
  it('sequential nodes have correct span', () => {
    const v2 = migrateRecipeV1toV2(makeRecipe(SHOKUPAN_STEPS))
    const { span } = computeSchedule(v2.graph, 'pane', 'shokupan', 0.6)

    // Span should be > 0 (sum of sequential durations)
    expect(span).toBeGreaterThan(0)
  })

  it('parallel lanes reduce span vs sequential', () => {
    // Margherita has prep lane running in parallel
    const { span } = computeSchedule(MARGHERITA_GRAPH, 'pizza', 'napoletana', 0)

    // The prep lane (10+30+30=70 min) runs in parallel with the main lane
    // Total span should be less than main + prep durations summed
    const mainDur = 15 + 120 + 10 + 180 + 3 + 5 + 1 // 334
    const prepDur = 10 + 30 + 30 // 70
    expect(span).toBeLessThan(mainDur + prepDur)
  })
})

describe('computeTimeSummary()', () => {
  it('categorizes node durations correctly', () => {
    const v2 = migrateRecipeV1toV2(makeRecipe(SHOKUPAN_STEPS))
    const { nodes, span } = computeSchedule(v2.graph, 'pane', 'shokupan', 0.6)
    const summary = computeTimeSummary(nodes, span)

    expect(summary.total).toBe(span)
    expect(summary.rise).toBeGreaterThan(0)
    expect(summary.prep).toBeGreaterThan(0)
    // bake may be 0 if shokupan synthetic data has no bake step
  })

  it('includes post_bake in bake category', () => {
    const { nodes, span } = computeSchedule(MARGHERITA_GRAPH, 'pizza', 'napoletana', 0)
    const summary = computeTimeSummary(nodes, span)

    // post_bake:garnish (1 min) should be included in bake
    expect(summary.bake).toBeGreaterThanOrEqual(1)
  })
})
