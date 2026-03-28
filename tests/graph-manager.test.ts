import { describe, it, expect } from 'vitest'
import {
  getParentIds,
  getChildNodeIds,
  getAncestorNodeIds,
  getDescendantNodeIds,
  topologicalSortGraph,
  validateGraph,
  addNodeToGraph,
  updateNodeData,
} from '@commons/utils/graph-manager'
import { makeNode, makeEdge, makeGraph } from './synthetic_data/helpers'
import type { RecipeGraph } from '@commons/types/recipe-graph'

function simpleGraph(): RecipeGraph {
  return makeGraph(
    [
      makeNode({ id: 'dough', type: 'dough', data: { title: 'Impasto', desc: '', group: 'Impasto', baseDur: 20, restDur: 0, restTemp: null, flours: [{ id: 0, type: 'gt_00_for', g: 500, temp: null }], liquids: [{ id: 0, type: 'Acqua', g: 300, temp: null }], extras: [], yeasts: [], salts: [], sugars: [], fats: [] } }),
      makeNode({ id: 'rise', type: 'rise', data: { title: 'Lievitazione', desc: '', group: 'Impasto', baseDur: 120, restDur: 0, restTemp: null, flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [] } }),
      makeNode({ id: 'bake', type: 'bake', data: { title: 'Cottura', desc: '', group: 'Impasto', baseDur: 30, restDur: 0, restTemp: null, flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [] } }),
    ],
    [makeEdge('dough', 'rise'), makeEdge('rise', 'bake')],
  )
}

// ═══════════════════════════════════════════════════════════════
// Topology
// ═══════════════════════════════════════════════════════════════

describe('GraphManager — topology', () => {
  const g = simpleGraph()

  it('getParentIds returns direct parents', () => {
    expect(getParentIds('rise', g.edges)).toEqual(['dough'])
    expect(getParentIds('dough', g.edges)).toEqual([])
  })

  it('getChildNodeIds returns direct children', () => {
    expect(getChildNodeIds('dough', g.edges)).toEqual(['rise'])
    expect(getChildNodeIds('bake', g.edges)).toEqual([])
  })

  it('getAncestorNodeIds returns all transitive parents', () => {
    const ancestors = getAncestorNodeIds('bake', g.edges)
    expect(ancestors.has('rise')).toBe(true)
    expect(ancestors.has('dough')).toBe(true)
    expect(ancestors.size).toBe(2)
  })

  it('getDescendantNodeIds returns all transitive children', () => {
    const descendants = getDescendantNodeIds('dough', g.edges)
    expect(descendants.has('rise')).toBe(true)
    expect(descendants.has('bake')).toBe(true)
    expect(descendants.size).toBe(2)
  })
})

// ═══════════════════════════════════════════════════════════════
// Topological sort
// ═══════════════════════════════════════════════════════════════

describe('GraphManager — topologicalSortGraph', () => {
  it('sorts linear graph in correct order', () => {
    const sorted = topologicalSortGraph(simpleGraph())
    const ids = sorted.map((n) => n.id)
    expect(ids.indexOf('dough')).toBeLessThan(ids.indexOf('rise'))
    expect(ids.indexOf('rise')).toBeLessThan(ids.indexOf('bake'))
  })

  it('handles diamond DAG', () => {
    const g = makeGraph(
      [
        makeNode({ id: 'a', type: 'dough' }),
        makeNode({ id: 'b', type: 'rise' }),
        makeNode({ id: 'c', type: 'rise' }),
        makeNode({ id: 'd', type: 'bake' }),
      ],
      [makeEdge('a', 'b'), makeEdge('a', 'c'), makeEdge('b', 'd'), makeEdge('c', 'd')],
    )
    const sorted = topologicalSortGraph(g)
    expect(sorted).toHaveLength(4)
    expect(sorted[0].id).toBe('a')
    expect(sorted[3].id).toBe('d')
  })
})

// ═══════════════════════════════════════════════════════════════
// Validation
// ═══════════════════════════════════════════════════════════════

describe('GraphManager — validateGraph', () => {
  it('valid graph passes', () => {
    const r = validateGraph(simpleGraph())
    expect(r.valid).toBe(true)
    expect(r.errors).toHaveLength(0)
  })

  it('detects edges to unknown nodes', () => {
    const g = makeGraph(
      [makeNode({ id: 'a', type: 'dough' })],
      [makeEdge('a', 'nonexistent')],
    )
    const r = validateGraph(g)
    expect(r.valid).toBe(false)
    expect(r.errors.some((e) => e.includes('unknown target'))).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
// addNodeToGraph
// ═══════════════════════════════════════════════════════════════

describe('GraphManager — addNodeToGraph', () => {
  it('inserts node after target with correct edges', () => {
    const g = simpleGraph() // dough → rise → bake
    const { graph, newNodeId } = addNodeToGraph(g, 'rise', 'pre_bake')

    expect(graph.nodes.find((n) => n.id === newNodeId)).toBeDefined()
    expect(graph.nodes).toHaveLength(4)

    // Edge: rise → newNode
    expect(graph.edges.some((e) => e.source === 'rise' && e.target === newNodeId)).toBe(true)
    // Edge: newNode → bake (re-routed)
    expect(graph.edges.some((e) => e.source === newNodeId && e.target === 'bake')).toBe(true)
    // NO direct edge from rise → bake anymore
    expect(graph.edges.some((e) => e.source === 'rise' && e.target === 'bake')).toBe(false)
  })

  it('does not mutate the original graph', () => {
    const g = simpleGraph()
    const originalNodeCount = g.nodes.length
    addNodeToGraph(g, 'rise', 'pre_bake')
    expect(g.nodes).toHaveLength(originalNodeCount) // unchanged
  })

  it('handles leaf node (no outgoing edges)', () => {
    const g = simpleGraph()
    const { graph, newNodeId } = addNodeToGraph(g, 'bake', 'done')
    expect(graph.edges.some((e) => e.source === 'bake' && e.target === newNodeId)).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
// updateNodeData
// ═══════════════════════════════════════════════════════════════

describe('GraphManager — updateNodeData', () => {
  it('merges patch into node data', () => {
    const g = simpleGraph()
    const updated = updateNodeData(g, 'dough', { title: 'Impasto Nuovo', baseDur: 30 })
    const node = updated.nodes.find((n) => n.id === 'dough')!
    expect(node.data.title).toBe('Impasto Nuovo')
    expect(node.data.baseDur).toBe(30)
    // Original properties preserved
    expect(node.data.flours).toHaveLength(1)
  })

  it('does not mutate original graph', () => {
    const g = simpleGraph()
    updateNodeData(g, 'dough', { title: 'Changed' })
    expect(g.nodes.find((n) => n.id === 'dough')!.data.title).toBe('Impasto')
  })
})
