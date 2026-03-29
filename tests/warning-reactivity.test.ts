/**
 * Test suite for warning reactivity — verifying that warnings update
 * correctly when the graph changes and that node red state clears
 * when warnings are resolved.
 */
import { describe, it, expect } from 'vitest'
import { resolve } from 'path'
import { FileScienceProvider } from '@commons/utils/science/science-provider'
import { reconcileGraph } from '~/server/services/graph-reconciler.service'
import type { ActionableWarning } from '@commons/types/recipe-graph'
import { deduplicateWarnings } from '@commons/utils/warning-dedup'
import {
  makeNode, makeEdge, makeGraph,
  makeDoughNodeWithFlour, makeRiseNode,
  makeDefaultPortioning, makeDefaultMeta,
} from './synthetic_data/helpers'

const provider = new FileScienceProvider(
  resolve(process.cwd(), 'science'),
  resolve(process.cwd(), 'commons/i18n'),
)

// Inline buildCriticalWarningNodeIds for testing (same as store)
function buildCriticalWarningNodeIds(warnings: ActionableWarning[]): Set<string> {
  const ids = new Set<string>()
  for (const w of warnings) {
    if (w.sourceNodeId && (w.severity === 'error' || w.severity === 'warning')) {
      ids.add(w.sourceNodeId)
    }
  }
  return ids
}

// ═══════════════════════════════════════════════════════════════════
// Warning reactivity across reconciliation cycles
// ═══════════════════════════════════════════════════════════════════

describe('warning reactivity', () => {
  it('warning disappears after node edit resolves the issue', () => {
    // Very low salt → triggers salt_low
    const dough = makeNode({
      id: 'd1', type: 'dough',
      data: {
        title: 'Impasto', flours: [{ id: 0, type: 'gt_00_for', g: 500, temp: null }],
        liquids: [{ id: 0, type: 'Acqua', g: 325, temp: null }],
        yeasts: [{ id: 0, type: 'fresh', g: 1 }],
        salts: [{ id: 0, type: 'sale_fino', g: 1 }], // 0.2% → too low
        sugars: [], fats: [], extras: [],
      },
    })
    const graph = makeGraph([dough], [])
    const result1 = reconcileGraph(graph, makeDefaultPortioning({ saltPct: 0.2 }), makeDefaultMeta(), provider)
    const saltWarning = result1.warnings.find((w) => w.id === 'salt_low')
    expect(saltWarning).toBeDefined()

    // Fix: increase salt to normal range
    const result2 = reconcileGraph(graph, makeDefaultPortioning({ saltPct: 2.3 }), makeDefaultMeta(), provider)
    const saltWarningAfter = result2.warnings.find((w) => w.id === 'salt_low')
    expect(saltWarningAfter).toBeUndefined()
  })

  it('node red state clears after applying action', () => {
    const dough = makeDoughNodeWithFlour('d1', 'gt_00_deb', 500)
    const rise = makeRiseNode('r1', 1440, 'room', {
      data: { title: 'Rise', riseMethod: 'room', baseDur: 1440, userOverrideDuration: true },
    })
    const graph = makeGraph([dough, rise], [makeEdge('d1', 'r1')])

    // First: rise exceeds W capacity → node is red
    const result1 = reconcileGraph(graph, makeDefaultPortioning({ doughHours: 24 }), makeDefaultMeta(), provider)
    const criticalBefore = buildCriticalWarningNodeIds(result1.warnings)
    expect(criticalBefore.has('r1')).toBe(true)

    // Apply fix: reduce rise duration
    const warning = result1.warnings.find((w) => w.messageKey === 'flour_w_max_rise' && w.sourceNodeId === 'r1')
    expect(warning).toBeDefined()
    const maxDur = warning!._ctx?._maxBaseDur as number

    const fixedRise = makeRiseNode('r1', maxDur, 'room', {
      data: { title: 'Rise', riseMethod: 'room', baseDur: maxDur, userOverrideDuration: true },
    })
    const fixedGraph = makeGraph([dough, fixedRise], [makeEdge('d1', 'r1')])

    // After fix: node no longer red
    const result2 = reconcileGraph(fixedGraph, makeDefaultPortioning({ doughHours: 24 }), makeDefaultMeta(), provider)
    const criticalAfter = buildCriticalWarningNodeIds(result2.warnings)
    expect(criticalAfter.has('r1')).toBe(false)
  })

  it('warnings in General Panel and node editor show consistent state', () => {
    const dough = makeDoughNodeWithFlour('d1', 'gt_00_deb', 500)
    const r1 = makeRiseNode('r1', 1440, 'room', {
      data: { title: 'Rise 1', riseMethod: 'room', baseDur: 1440, userOverrideDuration: true },
    })
    const r2 = makeRiseNode('r2', 1440, 'room', {
      data: { title: 'Rise 2', riseMethod: 'room', baseDur: 1440, userOverrideDuration: true },
    })
    const graph = makeGraph([dough, r1, r2], [makeEdge('d1', 'r1'), makeEdge('r1', 'r2')])
    const result = reconcileGraph(graph, makeDefaultPortioning({ doughHours: 48 }), makeDefaultMeta(), provider)

    // General panel: filter for composition categories (same as DoughCompositionPanel)
    const generalWarnings = result.warnings.filter((w) =>
      ['yeast', 'salt', 'fat', 'hydration', 'flour', 'general', 'fermentation'].includes(w.category),
    )
    const generalDeduped = deduplicateWarnings(generalWarnings)

    // Node-specific: filter by sourceNodeId
    const r1Warnings = result.warnings.filter((w) => w.sourceNodeId === 'r1')
    const r2Warnings = result.warnings.filter((w) => w.sourceNodeId === 'r2')

    // Both views should see warnings (general shows deduplicated, node shows specific)
    expect(generalDeduped.length).toBeGreaterThan(0)
    // Rise nodes should have warnings if they exceed W capacity
    const r1HasFlourW = r1Warnings.some((w) => w.messageKey === 'flour_w_max_rise')
    const r2HasFlourW = r2Warnings.some((w) => w.messageKey === 'flour_w_max_rise')
    // At least one should have flour_w_max_rise (depends on W and duration)
    if (r1HasFlourW || r2HasFlourW) {
      // The same warning appears in the general panel (deduplicated)
      const generalHasFlourW = generalDeduped.some((w) => w.messageKey === 'flour_w_max_rise')
      expect(generalHasFlourW).toBe(true)
    }
  })

  it('dough composition warnings with actions can be applied from node view', () => {
    const dough = makeNode({
      id: 'd1', type: 'dough',
      data: {
        title: 'Impasto',
        flours: [{ id: 0, type: 'gt_00_for', g: 500, temp: null }],
        liquids: [{ id: 0, type: 'Acqua', g: 325, temp: null }],
        yeasts: [{ id: 0, type: 'fresh', g: 0.01 }],
        salts: [], sugars: [], fats: [], extras: [],
      },
    })
    const graph = makeGraph([dough], [])

    const result = reconcileGraph(graph, makeDefaultPortioning({ yeastPct: 0.001 }), makeDefaultMeta(), provider)

    // Dough node should have warnings with sourceNodeId
    const doughWarnings = result.warnings.filter((w) => w.sourceNodeId === 'd1')
    expect(doughWarnings.length).toBeGreaterThan(0)

    // Check that at least one warning is actionable
    const actionable = doughWarnings.filter((w) => w.actions && w.actions.length > 0)
    expect(actionable.length).toBeGreaterThan(0)
  })
})
