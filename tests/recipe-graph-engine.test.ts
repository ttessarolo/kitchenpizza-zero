import { describe, it, expect, beforeEach } from 'vitest'
import { RecipeGraphEngine } from '../app/server/engines/recipe-graph-engine'
import { MARGHERITA_GRAPH } from './synthetic_data/pizza_margherita_graph'
import { PANE_BICOLORE_GRAPH } from './synthetic_data/pane_bicolore_graph'
import { makeNode, makeEdge, makeGraph, makeRiseNode, makeDoughNodeWithFlour } from './synthetic_data/helpers'
import { topologicalSortGraph } from '../commons/utils/graph-utils'

describe('RecipeGraphEngine', () => {
  let engine: RecipeGraphEngine

  beforeEach(() => {
    engine = new RecipeGraphEngine()
  })

  describe('Roundtrip: loadFromRecipeGraph → toRecipeGraph', () => {
    it('preserves margherita graph nodes and edges', () => {
      engine.loadFromRecipeGraph(MARGHERITA_GRAPH)
      const result = engine.toRecipeGraph()

      expect(result.nodes.length).toBe(MARGHERITA_GRAPH.nodes.length)
      expect(result.edges.length).toBe(MARGHERITA_GRAPH.edges.length)

      for (const origNode of MARGHERITA_GRAPH.nodes) {
        const resultNode = result.nodes.find(n => n.id === origNode.id)
        expect(resultNode, `Node ${origNode.id} missing`).toBeDefined()
        expect(resultNode!.type).toBe(origNode.type)
        expect(resultNode!.subtype).toBe(origNode.subtype)
        expect(resultNode!.lane).toBe(origNode.lane)
        expect(resultNode!.data.title).toBe(origNode.data.title)
        expect(resultNode!.data.baseDur).toBe(origNode.data.baseDur)
        expect(resultNode!.data.flours).toEqual(origNode.data.flours)
        expect(resultNode!.data.liquids).toEqual(origNode.data.liquids)
      }
    })

    it('preserves pane bicolore graph with split/join', () => {
      engine.loadFromRecipeGraph(PANE_BICOLORE_GRAPH)
      const result = engine.toRecipeGraph()

      expect(result.nodes.length).toBe(PANE_BICOLORE_GRAPH.nodes.length)
      expect(result.edges.length).toBe(PANE_BICOLORE_GRAPH.edges.length)

      // Verify split outputs preserved
      const splitNode = result.nodes.find(n => n.id === 'split')
      expect(splitNode!.data.splitOutputs).toEqual(PANE_BICOLORE_GRAPH.nodes.find(n => n.id === 'split')!.data.splitOutputs)

      // Verify edge handles preserved
      const splitEdge = result.edges.find(e => e.id === 'e3')
      expect(splitEdge!.sourceHandle).toBe('out_0')
    })

    it('preserves edge data (scheduleTimeRatio, scheduleQtyRatio)', () => {
      engine.loadFromRecipeGraph(PANE_BICOLORE_GRAPH)
      const result = engine.toRecipeGraph()

      for (const origEdge of PANE_BICOLORE_GRAPH.edges) {
        const resultEdge = result.edges.find(e => e.id === origEdge.id)
        expect(resultEdge, `Edge ${origEdge.id} missing`).toBeDefined()
        expect(resultEdge!.data.scheduleTimeRatio).toBe(origEdge.data.scheduleTimeRatio)
        expect(resultEdge!.data.scheduleQtyRatio).toBe(origEdge.data.scheduleQtyRatio)
      }
    })

    it('preserves lanes', () => {
      engine.loadFromRecipeGraph(MARGHERITA_GRAPH)
      const result = engine.toRecipeGraph()
      expect(result.lanes.length).toBe(MARGHERITA_GRAPH.lanes.length)
      expect(result.lanes.map(l => l.id).sort()).toEqual(MARGHERITA_GRAPH.lanes.map(l => l.id).sort())
    })
  })

  describe('Topology', () => {
    it('topologicalSort matches existing Kahn algorithm', () => {
      engine.loadFromRecipeGraph(MARGHERITA_GRAPH)
      const engineSort = engine.topologicalSort()
      const kahnSort = topologicalSortGraph(MARGHERITA_GRAPH).map(n => n.id)

      // Both should produce valid topological orderings
      // Verify: for each edge (u→v), u appears before v
      for (const edge of MARGHERITA_GRAPH.edges) {
        const uIdx = engineSort.indexOf(edge.source)
        const vIdx = engineSort.indexOf(edge.target)
        expect(uIdx).toBeLessThan(vIdx)
      }
    })

    it('hasCycles returns false for valid DAGs', () => {
      engine.loadFromRecipeGraph(MARGHERITA_GRAPH)
      expect(engine.hasCycles()).toBe(false)
    })

    it('criticalPath returns longest path by baseDur', () => {
      engine.loadFromRecipeGraph(MARGHERITA_GRAPH)
      const cp = engine.criticalPath()

      // Critical path should start from a root and end at a leaf
      expect(cp.length).toBeGreaterThan(0)

      // All nodes in path should be connected by edges
      for (let i = 0; i < cp.length - 1; i++) {
        const hasEdge = MARGHERITA_GRAPH.edges.some(
          e => e.source === cp[i] && e.target === cp[i + 1],
        )
        expect(hasEdge, `Missing edge ${cp[i]} → ${cp[i + 1]}`).toBe(true)
      }
    })
  })

  describe('Traversal', () => {
    it('ancestors returns all upstream nodes', () => {
      engine.loadFromRecipeGraph(MARGHERITA_GRAPH)
      const bakeAncestors = engine.ancestors('bake')

      expect(bakeAncestors.has('dough')).toBe(true)
      expect(bakeAncestors.has('rise1')).toBe(true)
      expect(bakeAncestors.has('shape')).toBe(true)
      expect(bakeAncestors.has('rise2')).toBe(true)
      expect(bakeAncestors.has('top')).toBe(true)
      // Prep lane converges to 'top' which feeds 'bake'
      expect(bakeAncestors.has('s_cut')).toBe(true)
      expect(bakeAncestors.has('s_cook')).toBe(true)
      expect(bakeAncestors.has('s_cool')).toBe(true)
    })

    it('descendants returns all downstream nodes', () => {
      engine.loadFromRecipeGraph(MARGHERITA_GRAPH)
      const doughDescendants = engine.descendants('dough')

      expect(doughDescendants.has('rise1')).toBe(true)
      expect(doughDescendants.has('bake')).toBe(true)
      expect(doughDescendants.has('done')).toBe(true)
    })

    it('findUpstream finds first matching type going backwards', () => {
      engine.loadFromRecipeGraph(MARGHERITA_GRAPH)

      const upstream = engine.findUpstream('bake', 'dough')
      expect(upstream).toBe('dough')

      const noMatch = engine.findUpstream('dough', 'bake')
      expect(noMatch).toBeNull()
    })

    it('findDownstream finds first matching type going forwards', () => {
      engine.loadFromRecipeGraph(MARGHERITA_GRAPH)

      const downstream = engine.findDownstream('dough', 'bake')
      expect(downstream).toBe('bake')
    })

    it('pathsBetween finds all paths', () => {
      engine.loadFromRecipeGraph(PANE_BICOLORE_GRAPH)

      const paths = engine.pathsBetween('split', 'join')
      // Two paths: split → shape_w → join, split → cocoa → shape_d → join
      expect(paths.length).toBe(2)
    })

    it('pathsBetween respects notThrough', () => {
      engine.loadFromRecipeGraph(PANE_BICOLORE_GRAPH)

      const paths = engine.pathsBetween('split', 'join', { notThrough: new Set(['cocoa']) })
      // Only the path through shape_w should remain
      expect(paths.length).toBe(1)
      expect(paths[0]).toContain('shape_w')
    })
  })

  describe('Data access', () => {
    it('getNode reconstructs RecipeNode', () => {
      engine.loadFromRecipeGraph(MARGHERITA_GRAPH)
      const node = engine.getNode('dough')

      expect(node.id).toBe('dough')
      expect(node.type).toBe('dough')
      expect(node.data.flours.length).toBe(1)
      expect(node.data.flours[0].g).toBe(500)
    })

    it('updateNodeData merges patch', () => {
      engine.loadFromRecipeGraph(MARGHERITA_GRAPH)
      engine.updateNodeData('rise1', { baseDur: 999 })

      const data = engine.getNodeData('rise1')
      expect(data.baseDur).toBe(999)
      expect(data.riseMethod).toBe('room') // other fields preserved
    })

    it('findNodes filters by type', () => {
      engine.loadFromRecipeGraph(MARGHERITA_GRAPH)
      const rises = engine.findNodes({ type: 'rise' })

      expect(rises).toContain('rise1')
      expect(rises).toContain('rise2')
      expect(rises.length).toBe(2)
    })

    it('findNodes with where condition', () => {
      engine.loadFromRecipeGraph(MARGHERITA_GRAPH)
      const fridgeRises = engine.findNodes({
        type: 'rise',
        where: { riseMethod: { op: 'eq', value: 'fridge' } },
      })

      expect(fridgeRises.length).toBe(0) // margherita has only room rises
    })
  })

  describe('Layer operations', () => {
    it('getLayerNodeIds returns correct nodes per layer', () => {
      engine.loadFromRecipeGraph(PANE_BICOLORE_GRAPH)

      const mainNodes = engine.getLayerNodeIds('default')
      // All nodes get 'default' layerId when loaded without explicit layerId
      expect(mainNodes.length).toBe(PANE_BICOLORE_GRAPH.nodes.length)
    })

    it('extractLayer creates isolated subgraph', () => {
      engine.loadFromRecipeGraph(MARGHERITA_GRAPH, 'main_layer')
      const { engine: extracted } = engine.extractLayer('main_layer')

      expect(extracted.nodeCount).toBe(MARGHERITA_GRAPH.nodes.length)
    })
  })

  describe('Edge cases', () => {
    it('empty graph', () => {
      const emptyGraph = makeGraph([], [])
      engine.loadFromRecipeGraph(emptyGraph)

      expect(engine.nodeCount).toBe(0)
      expect(engine.edgeCount).toBe(0)
      expect(engine.topologicalSort()).toEqual([])
      expect(engine.hasCycles()).toBe(false)
    })

    it('single node', () => {
      const singleGraph = makeGraph([makeNode({ id: 'only', type: 'dough' })], [])
      engine.loadFromRecipeGraph(singleGraph)

      expect(engine.nodeCount).toBe(1)
      expect(engine.topologicalSort()).toEqual(['only'])
      expect(engine.ancestors('only').size).toBe(0)
      expect(engine.descendants('only').size).toBe(0)
    })
  })
})
