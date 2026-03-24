import { describe, it, expect } from 'vitest'
import { validateGraph, topologicalSortGraph, getParentIds, getChildNodeIds, getAncestorNodeIds, getDescendantNodeIds, removeNodeFromGraph } from '@commons/utils/graph-utils'
import { makeNode, makeEdge, makeGraph } from './synthetic_data/helpers'
import { MARGHERITA_GRAPH } from './synthetic_data/pizza_margherita_graph'
import { PANE_BICOLORE_GRAPH } from './synthetic_data/pane_bicolore_graph'

describe('validateGraph()', () => {
  it('valid linear graph passes', () => {
    const g = makeGraph(
      [makeNode({ id: 'a', type: 'dough' }), makeNode({ id: 'b', type: 'rise' }), makeNode({ id: 'c', type: 'done' })],
      [makeEdge('a', 'b'), makeEdge('b', 'c')],
    )
    const r = validateGraph(g)
    expect(r.valid).toBe(true)
    expect(r.errors).toHaveLength(0)
  })

  it('detects cycle', () => {
    const g = makeGraph(
      [makeNode({ id: 'a', type: 'dough' }), makeNode({ id: 'b', type: 'rise' })],
      [makeEdge('a', 'b'), makeEdge('b', 'a')],
    )
    const r = validateGraph(g)
    expect(r.valid).toBe(false)
    expect(r.errors.some((e) => e.includes('cycle'))).toBe(true)
  })

  it('detects edge referencing unknown node', () => {
    const g = makeGraph(
      [makeNode({ id: 'a', type: 'dough' })],
      [makeEdge('a', 'nonexistent')],
    )
    const r = validateGraph(g)
    expect(r.valid).toBe(false)
    expect(r.errors.some((e) => e.includes('unknown target'))).toBe(true)
  })

  it('detects invalid scheduleTimeRatio', () => {
    const g = makeGraph(
      [makeNode({ id: 'a', type: 'dough' }), makeNode({ id: 'b', type: 'rise' })],
      [makeEdge('a', 'b', { scheduleTimeRatio: 1.5, scheduleQtyRatio: 1 })],
    )
    const r = validateGraph(g)
    expect(r.valid).toBe(false)
    expect(r.errors.some((e) => e.includes('scheduleTimeRatio'))).toBe(true)
  })

  it('detects split outputs not summing to 100%', () => {
    const g = makeGraph(
      [makeNode({ id: 's', type: 'split', data: { title: '', desc: '', group: 'Impasto', baseDur: 5, restDur: 0, restTemp: null, flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [], splitMode: 'pct', splitOutputs: [{ handle: 'out_0', label: 'A', value: 60 }, { handle: 'out_1', label: 'B', value: 30 }] } })],
      [],
    )
    const r = validateGraph(g)
    expect(r.valid).toBe(false)
    expect(r.errors.some((e) => e.includes('90%'))).toBe(true)
  })

  it('Margherita graph is valid', () => {
    const r = validateGraph(MARGHERITA_GRAPH)
    expect(r.valid).toBe(true)
  })

  it('Bicolore graph is valid', () => {
    const r = validateGraph(PANE_BICOLORE_GRAPH)
    expect(r.valid).toBe(true)
  })
})

describe('topologicalSortGraph()', () => {
  it('sorts linear graph in order', () => {
    const g = makeGraph(
      [makeNode({ id: 'c', type: 'done' }), makeNode({ id: 'a', type: 'dough' }), makeNode({ id: 'b', type: 'rise' })],
      [makeEdge('a', 'b'), makeEdge('b', 'c')],
    )
    const sorted = topologicalSortGraph(g)
    expect(sorted.map((n) => n.id)).toEqual(['a', 'b', 'c'])
  })

  it('sorts graph with parallel branches', () => {
    const sorted = topologicalSortGraph(PANE_BICOLORE_GRAPH)
    const ids = sorted.map((n) => n.id)

    // dough before rise1, rise1 before split, split before branches, join after branches
    expect(ids.indexOf('dough')).toBeLessThan(ids.indexOf('rise1'))
    expect(ids.indexOf('rise1')).toBeLessThan(ids.indexOf('split'))
    expect(ids.indexOf('split')).toBeLessThan(ids.indexOf('shape_w'))
    expect(ids.indexOf('split')).toBeLessThan(ids.indexOf('cocoa'))
    expect(ids.indexOf('shape_w')).toBeLessThan(ids.indexOf('join'))
    expect(ids.indexOf('shape_d')).toBeLessThan(ids.indexOf('join'))
  })
})

describe('getParentIds / getChildNodeIds', () => {
  it('returns correct parents and children', () => {
    const edges = MARGHERITA_GRAPH.edges
    expect(getParentIds('rise1', edges)).toEqual(['dough'])
    expect(getChildNodeIds('dough', edges)).toEqual(['rise1'])
    // pre_bake has two parents (from main + prep)
    expect(getParentIds('top', edges).sort()).toEqual(['rise2', 's_cool'].sort())
  })
})

describe('getAncestorNodeIds / getDescendantNodeIds', () => {
  it('returns all ancestors', () => {
    const ancestors = getAncestorNodeIds('top', MARGHERITA_GRAPH.edges)
    expect(ancestors.has('dough')).toBe(true)
    expect(ancestors.has('rise2')).toBe(true)
    expect(ancestors.has('s_cool')).toBe(true)
    expect(ancestors.has('s_cut')).toBe(true)
  })

  it('returns all descendants', () => {
    const desc = getDescendantNodeIds('split', PANE_BICOLORE_GRAPH.edges)
    expect(desc.has('shape_w')).toBe(true)
    expect(desc.has('cocoa')).toBe(true)
    expect(desc.has('shape_d')).toBe(true)
    expect(desc.has('join')).toBe(true)
    expect(desc.has('done')).toBe(true)
  })
})

describe('removeNodeFromGraph()', () => {
  it('transfers ingredients to child when removing first node', () => {
    const g = makeGraph(
      [
        makeNode({ id: 'a', type: 'dough', data: { title: '', desc: '', group: 'Impasto', baseDur: 10, restDur: 0, restTemp: null, flours: [{ id: 0, type: 'gt_00', g: 500, temp: null }], liquids: [{ id: 0, type: 'Acqua', g: 300, temp: null }], extras: [], yeasts: [], salts: [], sugars: [], fats: [] } }),
        makeNode({ id: 'b', type: 'rise', data: { title: '', desc: '', group: 'Impasto', baseDur: 60, restDur: 0, restTemp: null, flours: [], liquids: [{ id: 0, type: 'Acqua', g: 50, temp: null }], extras: [], yeasts: [], salts: [], sugars: [], fats: [] } }),
      ],
      [makeEdge('a', 'b')],
    )

    const result = removeNodeFromGraph('a', g)
    expect(result.nodes).toHaveLength(1)
    expect(result.nodes[0].id).toBe('b')
    // b should now have a's flour (500) and merged water (300+50=350)
    expect(result.nodes[0].data.flours).toHaveLength(1)
    expect(result.nodes[0].data.flours[0].g).toBe(500)
    expect(result.nodes[0].data.liquids[0].g).toBe(350)
  })

  it('reconnects edges through removed node', () => {
    const g = makeGraph(
      [
        makeNode({ id: 'a', type: 'dough' }),
        makeNode({ id: 'b', type: 'rest' }),
        makeNode({ id: 'c', type: 'rise' }),
      ],
      [makeEdge('a', 'b'), makeEdge('b', 'c')],
    )

    const result = removeNodeFromGraph('b', g)
    expect(result.nodes).toHaveLength(2)
    expect(result.edges).toHaveLength(1)
    expect(result.edges[0].source).toBe('a')
    expect(result.edges[0].target).toBe('c')
  })
})
