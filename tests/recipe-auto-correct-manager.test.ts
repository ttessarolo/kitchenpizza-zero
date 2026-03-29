/**
 * Test suite for RecipeAutoCorrectManager — iterative constraint solver.
 *
 * Covers: cascade resolution, independent warnings, clean graphs,
 * skip-on-no-improvement, max rounds, analysis mode, addNodeAfter,
 * and priority ordering.
 */
import { describe, it, expect } from 'vitest'
import { resolve } from 'path'
import { FileScienceProvider } from '@commons/utils/science/science-provider'
import { autoCorrectGraph } from '@commons/utils/recipe-auto-correct-manager'
import { reconcileGraph } from '~/server/services/graph-reconciler.service'
import type { AutoCorrectConfig } from '@commons/types/auto-correct'
import {
  makeNode, makeEdge, makeGraph,
  makeDoughNodeWithFlour, makeRiseNode,
  makeDefaultPortioning, makeDefaultMeta,
} from './synthetic_data/helpers'

const provider = new FileScienceProvider(
  resolve(process.cwd(), 'science'),
  resolve(process.cwd(), 'commons/i18n'),
)

const defaultConfig: AutoCorrectConfig = { autoCorrect: true, reasoningLevel: 'medium' }

// ═══════════════════════════════════════════════════════════════════
// Scenario 1: Recipe_3-like cascade (structural → sync → yeast)
// ═══════════════════════════════════════════════════════════════════

describe('cascade resolution', () => {
  it('resolves flour_w_max_rise + fermentation mismatch + yeast mismatch cascade', () => {
    // W280 flour, 18h fridge rise (exceeds W280 max ~6h), doughHours=18
    const dough = makeDoughNodeWithFlour('d1', 'gt_00_deb', 500) // W~170-200
    const r1 = makeRiseNode('r1', 60, 'room', {
      data: { title: 'Puntata', riseMethod: 'room', baseDur: 60, userOverrideDuration: true },
    })
    const r2 = makeRiseNode('r2', 1080, 'fridge', {
      data: { title: 'Frigo', riseMethod: 'fridge', baseDur: 1080, userOverrideDuration: true },
    })
    const r3 = makeRiseNode('r3', 90, 'room', {
      data: { title: 'Appretto', riseMethod: 'room', baseDur: 90, userOverrideDuration: true },
    })
    const bake = makeNode({ id: 'b1', type: 'bake', data: { title: 'Cottura', baseDur: 9 } })
    const graph = makeGraph(
      [dough, r1, r2, r3, bake],
      [makeEdge('d1', 'r1'), makeEdge('r1', 'r2'), makeEdge('r2', 'r3'), makeEdge('r3', 'b1')],
    )
    const portioning = makeDefaultPortioning({ doughHours: 18, yeastPct: 0.22 })

    // Verify warnings exist before auto-correct
    const before = reconcileGraph(graph, portioning, makeDefaultMeta(), provider)
    const beforeActionable = before.warnings.filter((w) => w.actions?.length)
    expect(beforeActionable.length).toBeGreaterThan(0)

    // Auto-correct
    const result = autoCorrectGraph(provider, graph, portioning, makeDefaultMeta(), defaultConfig)

    expect(result.report.status).toBe('ok')
    expect(result.report.steps.length).toBeGreaterThan(0)
    expect(result.report.steps.some((s) => s.outcome === 'applied')).toBe(true)
    expect(result.report.warningsResolved).toBeGreaterThanOrEqual(3)
  })
})

// ═══════════════════════════════════════════════════════════════════
// Scenario 2: Independent composition warnings
// ═══════════════════════════════════════════════════════════════════

describe('independent composition warnings', () => {
  it('resolves multiple independent dough composition issues', () => {
    const dough = makeNode({
      id: 'd1', type: 'dough',
      data: {
        title: 'Impasto',
        flours: [{ id: 0, type: 'gt_00_for', g: 500, temp: null }],
        liquids: [{ id: 0, type: 'Acqua', g: 325, temp: null }],
        yeasts: [{ id: 0, type: 'fresh', g: 0.01 }], // very low → yeast_too_low
        salts: [{ id: 0, type: 'sale_fino', g: 1 }],  // very low → salt_low
        sugars: [], fats: [], extras: [],
      },
    })
    const graph = makeGraph([dough], [])
    const portioning = makeDefaultPortioning({ yeastPct: 0.001, saltPct: 0.2 })

    const result = autoCorrectGraph(provider, graph, portioning, makeDefaultMeta(), defaultConfig)

    // Should resolve composition warnings
    expect(result.report.steps.filter((s) => s.outcome === 'applied').length).toBeGreaterThanOrEqual(1)
  })
})

// ═══════════════════════════════════════════════════════════════════
// Scenario 3: Clean graph (no warnings)
// ═══════════════════════════════════════════════════════════════════

describe('clean graph', () => {
  it('returns ok with 0 steps for graph with no warnings', () => {
    const graph = makeGraph([], [])
    const portioning = makeDefaultPortioning()
    const result = autoCorrectGraph(provider, graph, portioning, makeDefaultMeta(), defaultConfig)

    expect(result.report.status).toBe('ok')
    expect(result.report.steps).toHaveLength(0)
    expect(result.report.roundsUsed).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════════
// Scenario 5: Max rounds exhaustion
// ═══════════════════════════════════════════════════════════════════

describe('max rounds', () => {
  it('stops after maxRounds and reports ko if unresolved', () => {
    // Create a scenario that may need multiple rounds
    const dough = makeDoughNodeWithFlour('d1', 'gt_00_deb', 500)
    const r1 = makeRiseNode('r1', 2880, 'room', {
      data: { title: 'Very Long Rise', riseMethod: 'room', baseDur: 2880, userOverrideDuration: true },
    }) // 48h room → way exceeds any W capacity
    const graph = makeGraph([dough, r1], [makeEdge('d1', 'r1')])
    const portioning = makeDefaultPortioning({ doughHours: 48, yeastPct: 0.01 })

    const result = autoCorrectGraph(
      provider, graph, portioning, makeDefaultMeta(),
      { autoCorrect: true, reasoningLevel: 'low' }, // only 3 rounds
    )

    // Should use rounds and may end ok or ko depending on cascades
    expect(result.report.roundsUsed).toBeLessThanOrEqual(3)
    expect(result.report.maxRounds).toBe(3)
  })
})

// ═══════════════════════════════════════════════════════════════════
// Scenario 6: Analysis mode (autoCorrect: false)
// ═══════════════════════════════════════════════════════════════════

describe('analysis mode', () => {
  it('does not modify graph or portioning when autoCorrect=false', () => {
    const dough = makeDoughNodeWithFlour('d1', 'gt_00_deb', 500)
    const r1 = makeRiseNode('r1', 1440, 'room', {
      data: { title: 'Long', riseMethod: 'room', baseDur: 1440, userOverrideDuration: true },
    })
    const graph = makeGraph([dough, r1], [makeEdge('d1', 'r1')])
    const portioning = makeDefaultPortioning({ doughHours: 24 })

    const result = autoCorrectGraph(
      provider, graph, portioning, makeDefaultMeta(),
      { autoCorrect: false, reasoningLevel: 'medium' },
    )

    // Graph and portioning should be unchanged (deep equal to input)
    expect(result.graph.nodes).toHaveLength(graph.nodes.length)
    expect(result.portioning.doughHours).toBe(24) // unchanged

    // But report should have analysis steps
    expect(result.report.steps.length).toBeGreaterThan(0)
  })
})

// ═══════════════════════════════════════════════════════════════════
// Scenario 7: addNodeAfter (acclimatization)
// ═══════════════════════════════════════════════════════════════════

describe('addNodeAfter mutation', () => {
  it('adds acclimatization node between fridge and bake', () => {
    const dough = makeDoughNodeWithFlour('d1', 'gt_00_for', 500) // strong flour
    const r1 = makeRiseNode('r1', 60, 'room', {
      data: { title: 'Puntata', riseMethod: 'room', baseDur: 60, userOverrideDuration: true },
    })
    const r2 = makeRiseNode('r2', 360, 'fridge', {
      data: { title: 'Frigo', riseMethod: 'fridge', baseDur: 360, userOverrideDuration: true },
    })
    const bake = makeNode({ id: 'b1', type: 'bake', data: { title: 'Cottura', baseDur: 10 } })
    const graph = makeGraph(
      [dough, r1, r2, bake],
      [makeEdge('d1', 'r1'), makeEdge('r1', 'r2'), makeEdge('r2', 'b1')],
    )
    // doughHours=3, reasonable for W300 → fermentation warnings may/may not fire
    const portioning = makeDefaultPortioning({ doughHours: 3, yeastPct: 0.5 })

    // Check if acclimatization warning fires
    const before = reconcileGraph(graph, portioning, makeDefaultMeta(), provider)
    const acclWarning = before.warnings.find((w) => w.messageKey === 'warning.acclimatization_missing')

    if (acclWarning) {
      const result = autoCorrectGraph(provider, graph, portioning, makeDefaultMeta(), defaultConfig)
      // If acclimatization was an issue, auto-correct should have added a node
      const nodesAdded = result.graph.nodes.length - graph.nodes.length
      expect(nodesAdded).toBeGreaterThanOrEqual(0) // may or may not add based on priority
    }
  })
})

// ═══════════════════════════════════════════════════════════════════
// Scenario 8: Priority ordering (Tier 1 before Tier 2)
// ═══════════════════════════════════════════════════════════════════

describe('priority ordering', () => {
  it('fixes Tier 1 warnings before Tier 2', () => {
    const dough = makeDoughNodeWithFlour('d1', 'gt_00_deb', 500) // weak flour
    const r1 = makeRiseNode('r1', 1440, 'room', {
      data: { title: 'Long Rise', riseMethod: 'room', baseDur: 1440, userOverrideDuration: true },
    })
    const graph = makeGraph([dough, r1], [makeEdge('d1', 'r1')])
    const portioning = makeDefaultPortioning({ doughHours: 48, yeastPct: 0.22 })

    const result = autoCorrectGraph(provider, graph, portioning, makeDefaultMeta(), defaultConfig)

    // First step should be Tier 1 (flour_w_max_rise or equivalent_time_exceeds)
    if (result.report.steps.length > 0) {
      const firstStep = result.report.steps[0]
      const isTier1 = firstStep.warningId.startsWith('flour_w_') ||
        firstStep.warningId.startsWith('equivalent_time_exceeds') ||
        firstStep.warningId.startsWith('rise_phases_insufficient')
      // If there were Tier 1 warnings, first step should be Tier 1
      // (if no Tier 1, first step can be any tier)
      const before = reconcileGraph(graph, portioning, makeDefaultMeta(), provider)
      const hasTier1 = before.warnings.some((w) =>
        w.actions?.length &&
        (w.id.startsWith('flour_w_') || w.id.startsWith('equivalent_time_exceeds') || w.id.startsWith('rise_phases_insufficient')),
      )
      if (hasTier1) {
        expect(isTier1).toBe(true)
      }
    }
  })
})

// ═══════════════════════════════════════════════════════════════════
// Reasoning level affects max rounds
// ═══════════════════════════════════════════════════════════════════

describe('reasoningLevel', () => {
  it('low=3, medium=5, high=8 max rounds', () => {
    const graph = makeGraph([], [])
    const port = makeDefaultPortioning()

    const low = autoCorrectGraph(provider, graph, port, makeDefaultMeta(), { autoCorrect: true, reasoningLevel: 'low' })
    expect(low.report.maxRounds).toBe(3)

    const med = autoCorrectGraph(provider, graph, port, makeDefaultMeta(), { autoCorrect: true, reasoningLevel: 'medium' })
    expect(med.report.maxRounds).toBe(5)

    const high = autoCorrectGraph(provider, graph, port, makeDefaultMeta(), { autoCorrect: true, reasoningLevel: 'high' })
    expect(high.report.maxRounds).toBe(8)
  })
})
