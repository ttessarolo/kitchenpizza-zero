/**
 * Test suite for GraphMutationEngine — pure graph/portioning mutation functions.
 */
import { describe, it, expect } from 'vitest'
import {
  resolveNodeRef,
  resolvePatchValues,
  applyWarningActionPure,
} from '@commons/utils/graph-mutation-engine'
import type { ActionableWarning } from '@commons/types/recipe-graph'
import { makeNode, makeEdge, makeGraph, makeDefaultPortioning } from './synthetic_data/helpers'

// ═══════════════════════════════════════════════════════════════════
// resolveNodeRef
// ═══════════════════════════════════════════════════════════════════

describe('resolveNodeRef', () => {
  const nodes = [
    makeNode({ id: 'dough1', type: 'dough' }),
    makeNode({ id: 'rise1', type: 'rise' }),
    makeNode({ id: 'bake1', type: 'bake' }),
  ]
  const edges = [
    makeEdge('dough1', 'rise1'),
    makeEdge('rise1', 'bake1'),
  ]

  it('self → returns sourceNodeId', () => {
    expect(resolveNodeRef({ ref: 'self' }, 'rise1', nodes, edges)).toBe('rise1')
  })

  it('self without sourceNodeId → null', () => {
    expect(resolveNodeRef({ ref: 'self' }, undefined, nodes, edges)).toBeNull()
  })

  it('upstream_dough → walks edges to find dough node', () => {
    expect(resolveNodeRef({ ref: 'upstream_dough' }, 'rise1', nodes, edges)).toBe('dough1')
  })

  it('downstream_bake → walks edges to find bake node', () => {
    expect(resolveNodeRef({ ref: 'downstream_bake' }, 'rise1', nodes, edges)).toBe('bake1')
  })

  it('downstream_rise → walks edges to find rise node', () => {
    expect(resolveNodeRef({ ref: 'downstream_rise' }, 'dough1', nodes, edges)).toBe('rise1')
  })
})

// ═══════════════════════════════════════════════════════════════════
// resolvePatchValues
// ═══════════════════════════════════════════════════════════════════

describe('resolvePatchValues', () => {
  const nodes = [makeNode({ id: 'n1', type: 'rise' })]

  it('resolves _contextRef: prefix from _ctx', () => {
    const warning: ActionableWarning = {
      id: 'w1', category: 'fermentation', severity: 'warning',
      messageKey: 'test', _ctx: { equivalentRoomHours: 7.5 },
    }
    const result = resolvePatchValues({ doughHours: '_contextRef:equivalentRoomHours' }, 'n1', nodes, warning)
    expect(result.doughHours).toBe(7.5)
  })

  it('resolves _ prefix from _ctx', () => {
    const warning: ActionableWarning = {
      id: 'w1', category: 'flour', severity: 'warning',
      messageKey: 'test', _ctx: { _maxBaseDur: 360 },
    }
    const result = resolvePatchValues({ baseDur: '_maxBaseDur' }, 'n1', nodes, warning)
    expect(result.baseDur).toBe(360)
  })

  it('passes through non-reference values', () => {
    const warning: ActionableWarning = {
      id: 'w1', category: 'flour', severity: 'warning', messageKey: 'test',
    }
    const result = resolvePatchValues({ baseDur: 60, userOverrideDuration: true }, 'n1', nodes, warning)
    expect(result.baseDur).toBe(60)
    expect(result.userOverrideDuration).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════
// applyWarningActionPure
// ═══════════════════════════════════════════════════════════════════

describe('applyWarningActionPure', () => {
  it('updateNode — patches a node', () => {
    const graph = makeGraph(
      [makeNode({ id: 'r1', type: 'rise', data: { title: 'Rise', baseDur: 1080, riseMethod: 'fridge' } })],
      [],
    )
    const warning: ActionableWarning = {
      id: 'w1', sourceNodeId: 'r1', category: 'flour', severity: 'warning',
      messageKey: 'test', _ctx: { _maxBaseDur: 360 },
      actions: [{
        labelKey: 'fix',
        mutations: [{ type: 'updateNode', target: { ref: 'self' }, patch: { baseDur: '_maxBaseDur', userOverrideDuration: true } }],
      }],
    }
    const { graph: newGraph } = applyWarningActionPure(warning, 0, graph, makeDefaultPortioning())
    const rise = newGraph.nodes.find((n) => n.id === 'r1')!
    expect(rise.data.baseDur).toBe(360)
    expect(rise.data.userOverrideDuration).toBe(true)
  })

  it('updatePortioning — patches portioning', () => {
    const graph = makeGraph([], [])
    const warning: ActionableWarning = {
      id: 'w1', category: 'fermentation', severity: 'warning',
      messageKey: 'test', _ctx: { equivalentRoomHours: 7.5 },
      actions: [{
        labelKey: 'fix',
        mutations: [{ type: 'updatePortioning', patch: { doughHours: '_contextRef:equivalentRoomHours' } }],
      }],
    }
    const port = makeDefaultPortioning({ doughHours: 18 })
    const { portioning } = applyWarningActionPure(warning, 0, graph, port)
    expect(portioning.doughHours).toBe(7.5)
  })

  it('addNodeAfter — inserts node and re-routes edges', () => {
    const graph = makeGraph(
      [
        makeNode({ id: 'r1', type: 'rise', data: { title: 'Fridge', riseMethod: 'fridge', baseDur: 1080 } }),
        makeNode({ id: 'b1', type: 'bake', data: { title: 'Bake', baseDur: 15 } }),
      ],
      [makeEdge('r1', 'b1')],
    )
    const warning: ActionableWarning = {
      id: 'acclimatization', sourceNodeId: 'r1', category: 'fermentation', severity: 'info',
      messageKey: 'test',
      actions: [{
        labelKey: 'fix',
        mutations: [{
          type: 'addNodeAfter', target: { ref: 'self' },
          nodeType: 'rise', data: { title: 'Acclimatazione', baseDur: 45, riseMethod: 'room' },
        }],
      }],
    }
    const { graph: newGraph } = applyWarningActionPure(warning, 0, graph, makeDefaultPortioning())
    // Should have 3 nodes now
    expect(newGraph.nodes).toHaveLength(3)
    // New node should exist between r1 and b1
    const newNode = newGraph.nodes.find((n) => n.id !== 'r1' && n.id !== 'b1')!
    expect(newNode.type).toBe('rise')
    expect(newNode.data.riseMethod).toBe('room')
    // Edge from r1 → newNode
    expect(newGraph.edges.some((e) => e.source === 'r1' && e.target === newNode.id)).toBe(true)
    // Edge from newNode → b1
    expect(newGraph.edges.some((e) => e.source === newNode.id && e.target === 'b1')).toBe(true)
    // No direct edge from r1 → b1
    expect(newGraph.edges.some((e) => e.source === 'r1' && e.target === 'b1')).toBe(false)
  })

  it('no action at index → returns unchanged', () => {
    const graph = makeGraph([], [])
    const warning: ActionableWarning = {
      id: 'w1', category: 'flour', severity: 'warning', messageKey: 'test',
    }
    const port = makeDefaultPortioning()
    const result = applyWarningActionPure(warning, 0, graph, port)
    expect(result.graph).toEqual(graph)
    expect(result.portioning).toEqual(port)
  })
})
