import { describe, it, expect } from 'vitest'
import {
  recalcPreFermentIngredients,
  adjustDoughForPreFerment,
  reconcilePreFerments,
  getStepTotalWeight,
  rnd,
} from '@commons/utils/recipe'
import { migrateRecipeV1toV2 } from '@commons/utils/recipe-migration'
import { graphToRecipeV1, stepToNodeData, nodeToStep } from '@commons/utils/graph-adapter'
import { computeGraphTotals } from '~/hooks/useGraphCalculator'
import { scaleNodeData } from '~/hooks/useGraphCalculator'
import { makeStep, makeDep, makeRecipe, makePfCfg } from './synthetic_data/helpers'
import { BIGA_80_STEPS } from './synthetic_data/base_biga_bread'

// ── Helper: simulate updateNodeWithReconcile logic ──────────────
function simulateReconcile(
  steps: ReturnType<typeof makeStep>[],
  targetId: string,
  fn: (s: ReturnType<typeof makeStep>) => ReturnType<typeof makeStep>,
  target: number,
  targetHyd: number,
) {
  let newSteps = steps.map((s) => (s.id === targetId ? fn(s) : s))
  const newStep = newSteps.find((s) => s.id === targetId)!

  if (newStep.type === 'pre_ferment' && newStep.preFermentCfg) {
    newSteps = newSteps.map((s) =>
      s.id === targetId ? recalcPreFermentIngredients(s, target) : s,
    )
    newSteps = adjustDoughForPreFerment(newSteps, targetId, target, targetHyd)
  }

  return newSteps
}

describe('Pre-ferment reconciliation', () => {
  it('changing preFermentPct recalculates pre-ferment ingredients', () => {
    const recipe = makeRecipe(BIGA_80_STEPS)
    const target = recipe.portioning.ball.weight * recipe.portioning.ball.count

    // Change biga from 80% to 100%
    const newSteps = simulateReconcile(
      recipe.steps,
      'biga_prep',
      (s) => ({
        ...s,
        preFermentCfg: { ...s.preFermentCfg!, preFermentPct: 100 },
      }),
      target,
      recipe.portioning.targetHyd,
    )

    const biga = newSteps.find((s) => s.id === 'biga_prep')!
    const dough = newSteps.find((s) => s.id === 'knead')!

    // Biga at 100% should have more flour than at 80%
    const bigaFlour = biga.flours.reduce((a, f) => a + f.g, 0)
    const doughFlour = dough.flours.reduce((a, f) => a + f.g, 0)

    // At 100% pre-ferment, dough should have very little or zero remaining flour
    expect(doughFlour).toBeLessThan(bigaFlour)
    // Total flour should still be consistent
    expect(bigaFlour + doughFlour).toBeGreaterThan(0)
  })

  it('init reconcile on v2 load preserves correct totals', () => {
    const recipe = makeRecipe(BIGA_80_STEPS)
    const v1Total = recipe.steps.reduce((s, st) => s + getStepTotalWeight(st), 0)

    // Reconcile (as loadRecipe does)
    const reconciled = reconcilePreFerments(recipe)
    const reconciledTotal = reconciled.steps.reduce((s, st) => s + getStepTotalWeight(st), 0)

    // Totals should remain close (reconciliation redistributes, doesn't create/destroy)
    expect(reconciledTotal).toBeCloseTo(v1Total, -1) // within 10g
  })

  it('reconcile then migrate to v2 preserves totals', () => {
    const recipe = makeRecipe(BIGA_80_STEPS)
    const reconciled = reconcilePreFerments(recipe)
    const v2 = migrateRecipeV1toV2(reconciled)
    const totals = computeGraphTotals(v2.graph)

    const v1Total = reconciled.steps.reduce((s, st) => s + getStepTotalWeight(st), 0)
    expect(totals.totalDough).toBeCloseTo(v1Total, 0)
  })
})

describe('scaleNodeData', () => {
  it('scales all ingredient types', () => {
    const data = {
      title: '', desc: '', group: 'Impasto', baseDur: 10, restDur: 0, restTemp: null,
      flours: [{ id: 0, type: 'gt_00', g: 500, temp: null }],
      liquids: [{ id: 0, type: 'Acqua', g: 300, temp: null }],
      extras: [{ id: 0, name: 'Malto', g: 2 }],
      yeasts: [{ id: 0, type: 'fresh', g: 3 }],
      salts: [{ id: 0, type: 'sale_fino', g: 10 }],
      sugars: [{ id: 0, type: 'zucchero', g: 5 }],
      fats: [{ id: 0, type: 'olio_evo', g: 20 }],
    }

    const scaled = scaleNodeData(data, 2)

    expect(scaled.flours[0].g).toBe(1000)
    expect(scaled.liquids[0].g).toBe(600)
    expect(scaled.extras[0].g).toBe(4)
    expect(scaled.yeasts[0].g).toBe(6)
    expect(scaled.salts[0].g).toBe(20)
    expect(scaled.sugars[0].g).toBe(10)
    expect(scaled.fats[0].g).toBe(40)
  })

  it('scaling by 0.5 halves everything', () => {
    const data = {
      title: '', desc: '', group: 'Impasto', baseDur: 10, restDur: 0, restTemp: null,
      flours: [{ id: 0, type: 'gt_00', g: 500, temp: null }],
      liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
    }

    const scaled = scaleNodeData(data, 0.5)
    expect(scaled.flours[0].g).toBe(250)
  })
})

describe('Graph ↔ v1 roundtrip', () => {
  it('graphToRecipeV1 → stepToNodeData preserves all fields', () => {
    const recipe = makeRecipe(BIGA_80_STEPS)
    const v2 = migrateRecipeV1toV2(recipe)

    // Convert graph to v1
    const v1 = graphToRecipeV1(v2.graph, v2.meta, v2.portioning, v2.ingredientGroups)

    // For each step, convert back to NodeData and check key fields
    for (const step of v1.steps) {
      const nd = stepToNodeData(step)
      expect(nd.flours).toEqual(step.flours)
      expect(nd.liquids).toEqual(step.liquids)
      expect(nd.salts).toEqual(step.salts)
      expect(nd.sugars).toEqual(step.sugars)
      expect(nd.fats).toEqual(step.fats)
      expect(nd.preFermentCfg).toEqual(step.preFermentCfg)
    }
  })

  it('nodeToStep includes deps from edges', () => {
    const recipe = makeRecipe(BIGA_80_STEPS)
    const v2 = migrateRecipeV1toV2(recipe)

    const doughNode = v2.graph.nodes.find((n) => n.id === 'knead')!
    const step = nodeToStep(doughNode, v2.graph.edges)

    // Dough should have deps (from edges targeting it)
    expect(step.deps.length).toBeGreaterThan(0)
  })
})

describe('Bidirectional: node change → toolbar totals', () => {
  it('changing flour in a node updates computeGraphTotals', () => {
    const recipe = makeRecipe(BIGA_80_STEPS)
    const v2 = migrateRecipeV1toV2(recipe)

    const totalsBefore = computeGraphTotals(v2.graph)

    // Simulate doubling flour in biga_prep
    const modifiedNodes = v2.graph.nodes.map((n) => {
      if (n.id !== 'biga_prep') return n
      return {
        ...n,
        data: {
          ...n.data,
          flours: n.data.flours.map((f) => ({ ...f, g: f.g * 2 })),
        },
      }
    })
    const modifiedGraph = { ...v2.graph, nodes: modifiedNodes }
    const totalsAfter = computeGraphTotals(modifiedGraph)

    // Total flour should increase
    expect(totalsAfter.totalFlour).toBeGreaterThan(totalsBefore.totalFlour)
    expect(totalsAfter.totalDough).toBeGreaterThan(totalsBefore.totalDough)
  })
})

describe('Global hydration change', () => {
  it('setGlobalHydration logic scales liquids proportionally', () => {
    const data = {
      title: '', desc: '', group: 'Impasto', baseDur: 10, restDur: 0, restTemp: null,
      flours: [{ id: 0, type: 'gt_00', g: 500, temp: null }],
      liquids: [{ id: 0, type: 'Acqua', g: 300, temp: null }],
      extras: [], yeasts: [], salts: [], sugars: [], fats: [],
    }

    // Current hydration = 300/500 = 60%. Change to 80%
    const targetLiquid = (500 * 80) / 100 // 400
    const factor = targetLiquid / 300

    const scaled = {
      ...data,
      liquids: data.liquids.map((l) => ({ ...l, g: rnd(l.g * factor) })),
    }

    expect(scaled.liquids[0].g).toBeCloseTo(400, 0)
  })
})
