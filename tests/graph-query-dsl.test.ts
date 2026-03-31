import { describe, it, expect, beforeEach } from 'vitest'
import { RecipeGraphEngine } from '../app/server/engines/recipe-graph-engine'
import { executeQuery, matchesNode } from '../app/server/engines/graph-query-dsl'
import type { GraphQuery } from '../app/server/engines/graph-query-dsl'
import { MARGHERITA_GRAPH } from './synthetic_data/pizza_margherita_graph'
import { PANE_BICOLORE_GRAPH } from './synthetic_data/pane_bicolore_graph'
import { makeNode, makeEdge, makeGraph, makeRiseNode, makeDoughNodeWithFlour } from './synthetic_data/helpers'

describe('Graph Query DSL', () => {
  let engine: RecipeGraphEngine

  beforeEach(() => {
    engine = new RecipeGraphEngine()
  })

  describe('matchesNode', () => {
    it('matches by type', () => {
      engine.loadFromRecipeGraph(MARGHERITA_GRAPH)
      expect(matchesNode(engine, 'dough', { type: 'dough' })).toBe(true)
      expect(matchesNode(engine, 'dough', { type: 'rise' })).toBe(false)
    })

    it('matches by type array', () => {
      engine.loadFromRecipeGraph(MARGHERITA_GRAPH)
      expect(matchesNode(engine, 'dough', { type: ['dough', 'rise'] })).toBe(true)
      expect(matchesNode(engine, 'bake', { type: ['dough', 'rise'] })).toBe(false)
    })

    it('matches by where condition', () => {
      engine.loadFromRecipeGraph(MARGHERITA_GRAPH)
      expect(matchesNode(engine, 'rise1', {
        type: 'rise',
        where: { riseMethod: { op: 'eq', value: 'room' } },
      })).toBe(true)

      expect(matchesNode(engine, 'rise1', {
        type: 'rise',
        where: { riseMethod: { op: 'eq', value: 'fridge' } },
      })).toBe(false)
    })

    it('supports negate', () => {
      engine.loadFromRecipeGraph(MARGHERITA_GRAPH)
      expect(matchesNode(engine, 'dough', { type: 'dough', negate: true })).toBe(false)
      expect(matchesNode(engine, 'rise1', { type: 'dough', negate: true })).toBe(true)
    })
  })

  describe('find_nodes', () => {
    it('finds all nodes of a type', () => {
      engine.loadFromRecipeGraph(MARGHERITA_GRAPH)
      const result = executeQuery(engine, {
        type: 'find_nodes',
        where: { type: 'rise' },
      })

      expect(result.matchCount).toBe(2)
      expect(result.nodes).toContain('rise1')
      expect(result.nodes).toContain('rise2')
    })

    it('finds nodes with attribute filter', () => {
      engine.loadFromRecipeGraph(MARGHERITA_GRAPH)
      const result = executeQuery(engine, {
        type: 'find_nodes',
        where: {
          type: 'bake',
        },
      })

      expect(result.matchCount).toBe(1)
      expect(result.nodes).toContain('bake')
    })

    it('returns empty for no matches', () => {
      engine.loadFromRecipeGraph(MARGHERITA_GRAPH)
      const result = executeQuery(engine, {
        type: 'find_nodes',
        where: { type: 'rise', where: { riseMethod: { op: 'eq', value: 'fridge' } } },
      })

      expect(result.matchCount).toBe(0)
      expect(result.nodes).toEqual([])
    })
  })

  describe('find_path', () => {
    it('finds path between dough and bake', () => {
      engine.loadFromRecipeGraph(MARGHERITA_GRAPH)
      const result = executeQuery(engine, {
        type: 'find_path',
        from: { type: 'dough' },
        to: { type: 'bake' },
      })

      expect(result.matchCount).toBeGreaterThan(0)
      expect(result.paths!.length).toBeGreaterThan(0)
      // Path should contain dough and bake
      expect(result.paths![0][0]).toBe('dough')
      expect(result.paths![0][result.paths![0].length - 1]).toBe('bake')
    })

    it('filters with notThrough', () => {
      // Create graph: dough → rise(fridge) → bake  (no room rise in between)
      const graph = makeGraph(
        [
          makeDoughNodeWithFlour('dough', 'gt_00_for', 500),
          makeRiseNode('rise_fridge', 720, 'fridge'),
          makeRiseNode('rise_room', 60, 'room'),
          makeNode({ id: 'bake', type: 'bake', data: { title: 'Bake', baseDur: 10 } }),
        ],
        [
          makeEdge('dough', 'rise_fridge'),
          makeEdge('rise_fridge', 'bake'),
        ],
      )
      engine.loadFromRecipeGraph(graph)

      // Find fridge→bake without room rise in between (should match - acclimatization missing)
      const result = executeQuery(engine, {
        type: 'find_path',
        from: { type: 'rise', where: { riseMethod: { op: 'eq', value: 'fridge' } } },
        to: { type: 'bake' },
        notThrough: { type: 'rise', where: { riseMethod: { op: 'eq', value: 'room' } } },
      })

      expect(result.matchCount).toBeGreaterThan(0)
    })

    it('notThrough excludes paths with matching nodes', () => {
      // Graph: dough → rise(fridge) → rise(room) → bake
      const graph = makeGraph(
        [
          makeDoughNodeWithFlour('dough', 'gt_00_for', 500),
          makeRiseNode('rise_fridge', 720, 'fridge'),
          makeRiseNode('rise_room', 60, 'room'),
          makeNode({ id: 'bake', type: 'bake', data: { title: 'Bake', baseDur: 10 } }),
        ],
        [
          makeEdge('dough', 'rise_fridge'),
          makeEdge('rise_fridge', 'rise_room'),
          makeEdge('rise_room', 'bake'),
        ],
      )
      engine.loadFromRecipeGraph(graph)

      // Find fridge→bake without room in between (should NOT match - room rise exists)
      const result = executeQuery(engine, {
        type: 'find_path',
        from: { type: 'rise', where: { riseMethod: { op: 'eq', value: 'fridge' } } },
        to: { type: 'bake' },
        notThrough: { type: 'rise', where: { riseMethod: { op: 'eq', value: 'room' } } },
      })

      expect(result.matchCount).toBe(0)
    })
  })

  describe('find_pattern', () => {
    it('matches sequential node type pattern', () => {
      engine.loadFromRecipeGraph(MARGHERITA_GRAPH)
      const result = executeQuery(engine, {
        type: 'find_pattern',
        pattern: [{ type: 'rise' }, { type: 'shape' }],
      })

      expect(result.matchCount).toBeGreaterThan(0)
    })
  })

  describe('aggregate', () => {
    it('sums baseDur across nodes', () => {
      engine.loadFromRecipeGraph(MARGHERITA_GRAPH)
      const result = executeQuery(engine, {
        type: 'aggregate',
        where: { type: 'rise' },
        aggregate: { field: 'baseDur', op: 'sum' },
      })

      // rise1: 120 + rise2: 180 = 300
      expect(result.value).toBe(300)
    })

    it('counts nodes', () => {
      engine.loadFromRecipeGraph(MARGHERITA_GRAPH)
      const result = executeQuery(engine, {
        type: 'aggregate',
        where: { type: 'prep' },
        aggregate: { field: 'baseDur', op: 'count' },
      })

      // 3 prep nodes: s_cut, s_cook, s_cool
      expect(result.value).toBe(3)
    })
  })

  describe('Edge cases', () => {
    it('empty graph returns empty result', () => {
      engine.loadFromRecipeGraph(makeGraph([], []))
      const result = executeQuery(engine, { type: 'find_nodes', where: { type: 'dough' } })
      expect(result.matchCount).toBe(0)
    })

    it('invalid query type returns empty result', () => {
      engine.loadFromRecipeGraph(MARGHERITA_GRAPH)
      const result = executeQuery(engine, { type: 'unknown' as any })
      expect(result.matchCount).toBe(0)
    })
  })
})
