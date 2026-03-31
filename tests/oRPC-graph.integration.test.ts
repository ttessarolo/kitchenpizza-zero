/**
 * oRPC Graph Integration Tests — verify that oRPC procedures
 * (called directly, not via HTTP) produce correct results.
 */

import { describe, it, expect } from 'vitest'
import { resolve } from 'path'
import { FileScienceProvider } from '@commons/utils/science/science-provider'
import { reconcileGraph } from '~/server/services/graph-reconciler.service'
import { autoCorrectGraph } from '@commons/utils/recipe-auto-correct-manager'
import { MARGHERITA_GRAPH } from './synthetic_data/pizza_margherita_graph'
import { makeDefaultPortioning, makeDefaultMeta, makeGraph, makeNode, makeEdge } from './synthetic_data/helpers'

const provider = new FileScienceProvider(
  resolve(process.cwd(), 'science'),
  resolve(process.cwd(), 'commons/i18n'),
)

// ── A. graph.reconcile ───────────────────────────────────────────

describe('graph.reconcile — direct call', () => {
  it('reconciles margherita graph and returns correct shape', () => {
    const portioning = makeDefaultPortioning({ targetHyd: 65 })
    const meta = makeDefaultMeta({ type: 'pizza', subtype: 'napoletana' })
    const result = reconcileGraph(MARGHERITA_GRAPH, portioning, meta, provider)

    expect(result).toHaveProperty('graph')
    expect(result).toHaveProperty('portioning')
    expect(result).toHaveProperty('warnings')
    expect(Array.isArray(result.warnings)).toBe(true)
    expect(result.graph.nodes.length).toBe(MARGHERITA_GRAPH.nodes.length)
  })

  it('preserves node ids after reconciliation', () => {
    const portioning = makeDefaultPortioning()
    const meta = makeDefaultMeta({ type: 'pizza', subtype: 'napoletana' })
    const result = reconcileGraph(MARGHERITA_GRAPH, portioning, meta, provider)

    const inputIds = MARGHERITA_GRAPH.nodes.map((n) => n.id).sort()
    const outputIds = result.graph.nodes.map((n) => n.id).sort()
    expect(outputIds).toEqual(inputIds)
  })

  it('returns warnings as ActionableWarning[]', () => {
    const portioning = makeDefaultPortioning()
    const meta = makeDefaultMeta({ type: 'pizza', subtype: 'napoletana' })
    const result = reconcileGraph(MARGHERITA_GRAPH, portioning, meta, provider)

    for (const w of result.warnings) {
      expect(w).toHaveProperty('id')
      expect(w).toHaveProperty('severity')
      expect(w).toHaveProperty('messageKey')
    }
  })
})

// ── B. graph.autoCorrect ─────────────────────────────────────────

describe('graph.autoCorrect — direct call', () => {
  it('returns structured result with status', () => {
    const portioning = makeDefaultPortioning()
    const meta = makeDefaultMeta({ type: 'pizza', subtype: 'napoletana' })

    const result = autoCorrectGraph(
      provider,
      reconcileGraph,
      MARGHERITA_GRAPH,
      portioning,
      meta,
      { reasoningLevel: 'medium', lockedFields: {} },
    )

    expect(result).toHaveProperty('graph')
    expect(result).toHaveProperty('portioning')
    expect(result).toHaveProperty('report')
    expect(result.report).toHaveProperty('status')
    expect(['ok', 'ko', 'partial']).toContain(result.report.status)
  })

  it('produces a report with steps array', () => {
    const portioning = makeDefaultPortioning()
    const meta = makeDefaultMeta({ type: 'pizza', subtype: 'napoletana' })

    const result = autoCorrectGraph(
      provider,
      reconcileGraph,
      MARGHERITA_GRAPH,
      portioning,
      meta,
      { reasoningLevel: 'medium', lockedFields: {} },
    )

    expect(result.report).toHaveProperty('steps')
    expect(Array.isArray(result.report.steps)).toBe(true)
  })
})

// ── C. Error handling ────────────────────────────────────────────

describe('graph.reconcile — edge cases', () => {
  it('returns empty warnings for empty graph', () => {
    const emptyGraph = makeGraph([], [])
    const portioning = makeDefaultPortioning()
    const meta = makeDefaultMeta()

    const result = reconcileGraph(emptyGraph, portioning, meta, provider)

    expect(result.warnings).toEqual([])
    expect(result.graph.nodes.length).toBe(0)
  })

  it('handles graph with single dough node (no edges)', () => {
    const singleNodeGraph = makeGraph(
      [
        makeNode({
          id: 'dough',
          type: 'dough',
          data: {
            title: 'Impasto',
            flours: [{ id: 0, type: 'gt_00_for', g: 500, temp: null }],
            liquids: [{ id: 0, type: 'Acqua', g: 325, temp: null }],
            yeasts: [{ id: 0, type: 'fresh', g: 3 }],
            salts: [{ id: 0, type: 'sale_fino', g: 10 }],
          },
        }),
      ],
      [],
    )
    const portioning = makeDefaultPortioning()
    const meta = makeDefaultMeta()

    const result = reconcileGraph(singleNodeGraph, portioning, meta, provider)

    expect(result).toHaveProperty('graph')
    expect(result).toHaveProperty('warnings')
    expect(Array.isArray(result.warnings)).toBe(true)
    expect(result.graph.nodes.length).toBe(1)
  })
})
