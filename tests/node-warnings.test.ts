/**
 * Test suite for per-node warning filtering, sourceNodeId assignment,
 * and actionable warning resolution.
 */
import { describe, it, expect } from 'vitest'
import { resolve } from 'path'
import { FileScienceProvider } from '@commons/utils/science/science-provider'
import { reconcileGraph } from '~/server/services/graph-reconciler.service'
import type { ActionableWarning } from '@commons/types/recipe-graph'
import {
  makeNode, makeEdge, makeGraph,
  makeDoughNodeWithFlour, makeRiseNode,
  makeDefaultPortioning, makeDefaultMeta,
} from './synthetic_data/helpers'

const provider = new FileScienceProvider(
  resolve(process.cwd(), 'science'),
  resolve(process.cwd(), 'commons/i18n'),
)

// ═══════════════════════════════════════════════════════════════════
// 1. Per-node warning filtering
// ═══════════════════════════════════════════════════════════════════

describe('per-node warning filtering', () => {
  it('filtering by sourceNodeId returns only that node warnings', () => {
    const warnings: ActionableWarning[] = [
      { id: 'w1', sourceNodeId: 'rise_1', category: 'flour', severity: 'warning', messageKey: 'a' },
      { id: 'w2', sourceNodeId: 'rise_1', category: 'fermentation', severity: 'warning', messageKey: 'b' },
      { id: 'w3', sourceNodeId: 'rise_1', category: 'flour', severity: 'error', messageKey: 'c' },
      { id: 'w4', sourceNodeId: 'bake_1', category: 'baking', severity: 'warning', messageKey: 'd' },
      { id: 'w5', sourceNodeId: 'bake_1', category: 'temp', severity: 'info', messageKey: 'e' },
    ]
    const rise1Warnings = warnings.filter((w) => w.sourceNodeId === 'rise_1')
    expect(rise1Warnings).toHaveLength(3)
    const bake1Warnings = warnings.filter((w) => w.sourceNodeId === 'bake_1')
    expect(bake1Warnings).toHaveLength(2)
  })

  it('canonical warnings (no sourceNodeId) are excluded from per-node view', () => {
    const warnings: ActionableWarning[] = [
      { id: 'canonical', category: 'fermentation', severity: 'warning', messageKey: 'a' },
      { id: 'node_w', sourceNodeId: 'rise_1', category: 'fermentation', severity: 'warning', messageKey: 'a' },
    ]
    const nodeWarnings = warnings.filter((w) => w.sourceNodeId === 'rise_1')
    expect(nodeWarnings).toHaveLength(1)
    expect(nodeWarnings[0].id).toBe('node_w')
  })
})

// ═══════════════════════════════════════════════════════════════════
// 2. Reconciler sourceNodeId assignment
// ═══════════════════════════════════════════════════════════════════

describe('reconciler sourceNodeId assignment', () => {
  it('dough composition warnings have sourceNodeId = dough node id', () => {
    const graph = makeGraph(
      [
        makeNode({
          id: 'dough1', type: 'dough',
          data: {
            title: 'Impasto', flours: [{ id: 0, type: 'gt_00_for', g: 500, temp: null }],
            liquids: [{ id: 0, type: 'Acqua', g: 325, temp: null }],
            yeasts: [{ id: 0, type: 'fresh', g: 0.01 }], // very low yeast → triggers yeast_too_low
            salts: [], sugars: [], fats: [], extras: [],
          },
        }),
      ],
      [],
    )
    const result = reconcileGraph(graph, makeDefaultPortioning({ yeastPct: 0.001 }), makeDefaultMeta(), provider)
    const doughWarnings = result.warnings.filter((w) => w.sourceNodeId === 'dough1')
    expect(doughWarnings.length).toBeGreaterThan(0)
  })

  it('flour_w_max_rise has sourceNodeId = rise node id', () => {
    const dough = makeDoughNodeWithFlour('d1', 'gt_00_deb', 500) // weak flour ~W170
    const rise = makeRiseNode('r1', 1440, 'room', {
      data: { title: 'Long rise', riseMethod: 'room', baseDur: 1440, userOverrideDuration: true },
    }) // 24h room → exceeds W170 max
    const graph = makeGraph([dough, rise], [makeEdge('d1', 'r1')])
    const result = reconcileGraph(graph, makeDefaultPortioning({ doughHours: 24 }), makeDefaultMeta(), provider)

    const flourWarning = result.warnings.find((w) => w.messageKey === 'flour_w_max_rise')
    expect(flourWarning).toBeDefined()
    expect(flourWarning!.sourceNodeId).toBe('r1')
  })

  it('flour_w_max_rise is actionable with reduce_rise_to_max', () => {
    const dough = makeDoughNodeWithFlour('d1', 'gt_00_deb', 500)
    const rise = makeRiseNode('r1', 1440, 'room', {
      data: { title: 'Long rise', riseMethod: 'room', baseDur: 1440, userOverrideDuration: true },
    })
    const graph = makeGraph([dough, rise], [makeEdge('d1', 'r1')])
    const result = reconcileGraph(graph, makeDefaultPortioning({ doughHours: 24 }), makeDefaultMeta(), provider)

    const flourWarning = result.warnings.find((w) => w.messageKey === 'flour_w_max_rise')
    expect(flourWarning).toBeDefined()
    expect(flourWarning!.actions).toBeDefined()
    expect(flourWarning!.actions!.length).toBeGreaterThan(0)
    expect(flourWarning!.actions![0].labelKey).toBe('action.reduce_rise_to_max')
    expect(flourWarning!.actions![0].mutations[0].type).toBe('updateNode')
  })

  it('split_sum_not_100 has sourceNodeId = split node id', () => {
    const graph = makeGraph(
      [
        makeNode({
          id: 'split1', type: 'split',
          data: {
            title: 'Split', splitMode: 'pct',
            splitOutputs: [{ name: 'A', value: 40 }, { name: 'B', value: 40 }], // sum=80 ≠ 100
            flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
          },
        }),
      ],
      [],
    )
    const result = reconcileGraph(graph, makeDefaultPortioning(), makeDefaultMeta(), provider)
    const splitWarning = result.warnings.find((w) => w.messageKey === 'split_sum_not_100')
    expect(splitWarning).toBeDefined()
    expect(splitWarning!.sourceNodeId).toBe('split1')
  })
})

// ═══════════════════════════════════════════════════════════════════
// 3. Applying action resolves warning
// ═══════════════════════════════════════════════════════════════════

describe('applying flour_w_max_rise action resolves warning', () => {
  it('reducing rise duration to max removes the warning', () => {
    const dough = makeDoughNodeWithFlour('d1', 'gt_00_deb', 500)
    const rise = makeRiseNode('r1', 1440, 'room', {
      data: { title: 'Long rise', riseMethod: 'room', baseDur: 1440, userOverrideDuration: true },
    })
    const graph = makeGraph([dough, rise], [makeEdge('d1', 'r1')])
    const portioning = makeDefaultPortioning({ doughHours: 24 })

    // First reconcile → warning exists
    const result1 = reconcileGraph(graph, portioning, makeDefaultMeta(), provider)
    const warning = result1.warnings.find((w) => w.messageKey === 'flour_w_max_rise')
    expect(warning).toBeDefined()
    const maxBaseDur = warning!._ctx?._maxBaseDur as number
    expect(maxBaseDur).toBeGreaterThan(0)

    // Apply the action: reduce baseDur to max
    const fixedRise = makeRiseNode('r1', maxBaseDur, 'room', {
      data: { title: 'Long rise', riseMethod: 'room', baseDur: maxBaseDur, userOverrideDuration: true },
    })
    const fixedGraph = makeGraph([dough, fixedRise], [makeEdge('d1', 'r1')])

    // Second reconcile → warning gone
    const result2 = reconcileGraph(fixedGraph, portioning, makeDefaultMeta(), provider)
    const warningAfter = result2.warnings.find((w) => w.messageKey === 'flour_w_max_rise')
    expect(warningAfter).toBeUndefined()
  })
})
