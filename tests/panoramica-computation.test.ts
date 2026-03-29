import { describe, it, expect } from 'vitest'
import { computePanoramica, generateTimeline } from '@commons/utils/panoramica-manager'
import { staticProvider } from '@commons/utils/science/static-science-provider'
import {
  makeLayer,
  makeCrossEdge,
  makeNode,
  makeEdge,
} from './synthetic_data/helpers'

// ── computePanoramica ──────────────────────────────────────────

describe('computePanoramica', () => {
  it('single layer: computes critical path and timing', () => {
    const nodes = [
      makeNode({ id: 'a', type: 'dough', data: { title: 'Impasto', baseDur: 20 } }),
      makeNode({ id: 'b', type: 'rise', data: { title: 'Lievitazione', baseDur: 120 } }),
      makeNode({ id: 'c', type: 'shape', data: { title: 'Formatura', baseDur: 15 } }),
    ]
    const edges = [makeEdge('a', 'b'), makeEdge('b', 'c')]
    const layer = makeLayer({ id: 'l1', type: 'impasto', nodes, edges })

    const result = computePanoramica(staticProvider, [layer], [])

    expect(result.layers).toHaveLength(1)
    expect(result.totalDuration).toBe(155) // 20 + 120 + 15
    expect(result.criticalLayerId).toBe('l1')
    expect(result.layers[0].criticalPath).toEqual(['a', 'b', 'c'])
    expect(result.layers[0].nodeCount).toBe(3)
    expect(result.crossDependencies).toEqual([])
  })

  it('two layers with cross-edge: collects dependencies', () => {
    const impastoNodes = [
      makeNode({ id: 'imp1', type: 'dough', data: { title: 'Impasto', baseDur: 30 } }),
      makeNode({ id: 'imp2', type: 'shape', data: { title: 'Formatura', baseDur: 10 } }),
    ]
    const impastoEdges = [makeEdge('imp1', 'imp2')]
    const impastoLayer = makeLayer({ id: 'l_imp', type: 'impasto', nodes: impastoNodes, edges: impastoEdges })

    const sauceNodes = [
      makeNode({ id: 's1', type: 'ingredient', data: { title: 'Pomodori', baseDur: 5 } }),
      makeNode({ id: 's2', type: 'cook', data: { title: 'Cottura sugo', baseDur: 15 } }),
    ]
    const sauceEdges = [makeEdge('s1', 's2')]
    const sauceLayer = makeLayer({ id: 'l_sauce', type: 'sauce', nodes: sauceNodes, edges: sauceEdges })

    const crossEdge = makeCrossEdge('l_imp', 'imp2', 'l_sauce', 's1', { label: 'timing' })

    const result = computePanoramica(staticProvider, [impastoLayer, sauceLayer], [crossEdge])

    expect(result.layers).toHaveLength(2)
    expect(result.crossDependencies).toHaveLength(1)
    expect(result.crossDependencies[0].sourceLayerId).toBe('l_imp')
    expect(result.crossDependencies[0].targetLayerId).toBe('l_sauce')
    expect(result.crossDependencies[0].label).toBe('timing')
    // Total duration = max(40, 20) = 40 (impasto is longer)
    expect(result.totalDuration).toBe(40)
    expect(result.criticalLayerId).toBe('l_imp')
  })

  it('parallel tracks: total duration is the max of all layers', () => {
    const fastLayer = makeLayer({
      id: 'fast',
      type: 'prep',
      nodes: [makeNode({ id: 'f1', type: 'cut', data: { title: 'Taglio', baseDur: 5 } })],
      edges: [],
    })
    const slowLayer = makeLayer({
      id: 'slow',
      type: 'impasto',
      nodes: [
        makeNode({ id: 's1', type: 'dough', data: { title: 'Impasto', baseDur: 30 } }),
        makeNode({ id: 's2', type: 'rise', data: { title: 'Lievitazione', baseDur: 600 } }),
      ],
      edges: [makeEdge('s1', 's2')],
    })
    const mediumLayer = makeLayer({
      id: 'medium',
      type: 'sauce',
      nodes: [
        makeNode({ id: 'm1', type: 'ingredient', data: { title: 'Ingredienti', baseDur: 5 } }),
        makeNode({ id: 'm2', type: 'cook', data: { title: 'Cottura', baseDur: 45 } }),
      ],
      edges: [makeEdge('m1', 'm2')],
    })

    const result = computePanoramica(staticProvider, [fastLayer, slowLayer, mediumLayer], [])

    expect(result.totalDuration).toBe(630) // slow layer: 30 + 600
    expect(result.criticalLayerId).toBe('slow')
    expect(result.layers).toHaveLength(3)
  })

  it('empty layers: zero duration, empty critical path', () => {
    const emptyLayer = makeLayer({ id: 'empty', type: 'prep', nodes: [], edges: [] })

    const result = computePanoramica(staticProvider, [emptyLayer], [])

    expect(result.layers).toHaveLength(1)
    expect(result.layers[0].totalDuration).toBe(0)
    expect(result.layers[0].criticalPath).toEqual([])
    expect(result.layers[0].nodeCount).toBe(0)
    expect(result.totalDuration).toBe(0)
  })

  it('no layers: returns empty result', () => {
    const result = computePanoramica(staticProvider, [], [])

    expect(result.layers).toEqual([])
    expect(result.crossDependencies).toEqual([])
    expect(result.totalDuration).toBe(0)
    expect(result.criticalLayerId).toBe('')
  })

  it('single node layer: critical path is that single node', () => {
    const layer = makeLayer({
      id: 'one',
      type: 'prep',
      nodes: [makeNode({ id: 'only', type: 'mix', data: { title: 'Mischiare', baseDur: 10 } })],
      edges: [],
    })

    const result = computePanoramica(staticProvider, [layer], [])

    expect(result.layers[0].criticalPath).toEqual(['only'])
    expect(result.layers[0].totalDuration).toBe(10)
  })

  it('preserves layer metadata (name, type)', () => {
    const layer = makeLayer({
      id: 'meta_test',
      type: 'ferment',
      name: 'Kimchi Fermentation',
      nodes: [makeNode({ id: 'f1', type: 'ferment_node', data: { title: 'Ferment', baseDur: 4320 } })],
      edges: [],
    })

    const result = computePanoramica(staticProvider, [layer], [])

    expect(result.layers[0].name).toBe('Kimchi Fermentation')
    expect(result.layers[0].layerType).toBe('ferment')
    expect(result.layers[0].layerId).toBe('meta_test')
  })

  it('diamond graph: picks longest path', () => {
    // a -> b (long) -> d
    // a -> c (short) -> d
    const nodes = [
      makeNode({ id: 'a', type: 'ingredient', data: { title: 'Start', baseDur: 5 } }),
      makeNode({ id: 'b', type: 'cook', data: { title: 'Slow path', baseDur: 60 } }),
      makeNode({ id: 'c', type: 'cut', data: { title: 'Fast path', baseDur: 10 } }),
      makeNode({ id: 'd', type: 'plate', data: { title: 'End', baseDur: 5 } }),
    ]
    const edges = [
      makeEdge('a', 'b'),
      makeEdge('a', 'c'),
      makeEdge('b', 'd'),
      makeEdge('c', 'd'),
    ]
    const layer = makeLayer({ id: 'diamond', type: 'prep', nodes, edges })

    const result = computePanoramica(staticProvider, [layer], [])

    // Critical path: a(5) + b(60) + d(5) = 70
    expect(result.totalDuration).toBe(70)
    expect(result.layers[0].criticalPath).toEqual(['a', 'b', 'd'])
  })

  it('multiple cross-edges are all collected', () => {
    const l1 = makeLayer({
      id: 'l1',
      type: 'impasto',
      nodes: [makeNode({ id: 'n1', type: 'dough', data: { title: 'A', baseDur: 10 } })],
      edges: [],
    })
    const l2 = makeLayer({
      id: 'l2',
      type: 'sauce',
      nodes: [makeNode({ id: 'n2', type: 'ingredient', data: { title: 'B', baseDur: 5 } })],
      edges: [],
    })
    const l3 = makeLayer({
      id: 'l3',
      type: 'prep',
      nodes: [makeNode({ id: 'n3', type: 'assemble', data: { title: 'C', baseDur: 8 } })],
      edges: [],
    })

    const crossEdges = [
      makeCrossEdge('l1', 'n1', 'l3', 'n3'),
      makeCrossEdge('l2', 'n2', 'l3', 'n3'),
    ]

    const result = computePanoramica(staticProvider, [l1, l2, l3], crossEdges)

    expect(result.crossDependencies).toHaveLength(2)
    expect(result.crossDependencies[0].sourceLayerId).toBe('l1')
    expect(result.crossDependencies[1].sourceLayerId).toBe('l2')
    expect(result.crossDependencies[0].targetLayerId).toBe('l3')
    expect(result.crossDependencies[1].targetLayerId).toBe('l3')
  })
})

// ── generateTimeline ──────────────────────────────────────────

describe('generateTimeline', () => {
  it('reverse scheduling: critical layer ends at target time', () => {
    const nodes = [
      makeNode({ id: 'a', type: 'dough', data: { title: 'Start', baseDur: 30 } }),
      makeNode({ id: 'b', type: 'rise', data: { title: 'Middle', baseDur: 120 } }),
    ]
    const edges = [makeEdge('a', 'b')]
    const layer = makeLayer({ id: 'l1', type: 'impasto', nodes, edges })

    const panoramica = computePanoramica(staticProvider, [layer], [])
    const targetTime = 480 // 8 hours from now

    const timeline = generateTimeline(panoramica, targetTime)

    expect(timeline.length).toBeGreaterThan(0)
    // First step starts at targetTime - totalDuration
    const firstStep = timeline[0]
    expect(firstStep.time).toBe(480 - 150) // 330
    expect(firstStep.layerId).toBe('l1')
  })

  it('empty panoramica: returns empty timeline', () => {
    const panoramica = computePanoramica(staticProvider, [], [])
    const timeline = generateTimeline(panoramica, 480)

    expect(timeline).toEqual([])
  })

  it('multi-layer: all layers appear in timeline sorted by time', () => {
    const fastLayer = makeLayer({
      id: 'fast',
      type: 'prep',
      nodes: [makeNode({ id: 'f1', type: 'cut', data: { title: 'Quick Cut', baseDur: 10 } })],
      edges: [],
    })
    const slowLayer = makeLayer({
      id: 'slow',
      type: 'impasto',
      nodes: [
        makeNode({ id: 's1', type: 'dough', data: { title: 'Mix', baseDur: 20 } }),
        makeNode({ id: 's2', type: 'rise', data: { title: 'Rise', baseDur: 480 } }),
      ],
      edges: [makeEdge('s1', 's2')],
    })

    const panoramica = computePanoramica(staticProvider, [fastLayer, slowLayer], [])
    const timeline = generateTimeline(panoramica, 600)

    expect(timeline.length).toBeGreaterThan(0)

    // Verify sorting: each step.time <= next step.time
    for (let i = 1; i < timeline.length; i++) {
      expect(timeline[i].time).toBeGreaterThanOrEqual(timeline[i - 1].time)
    }

    // Both layers appear
    const layerIds = new Set(timeline.map((s) => s.layerId))
    expect(layerIds.has('fast')).toBe(true)
    expect(layerIds.has('slow')).toBe(true)
  })

  it('timeline steps reference correct node IDs', () => {
    const layer = makeLayer({
      id: 'l1',
      type: 'prep',
      nodes: [
        makeNode({ id: 'x1', type: 'ingredient', data: { title: 'Prep', baseDur: 5 } }),
        makeNode({ id: 'x2', type: 'cook', data: { title: 'Cook', baseDur: 30 } }),
      ],
      edges: [makeEdge('x1', 'x2')],
    })

    const panoramica = computePanoramica(staticProvider, [layer], [])
    const timeline = generateTimeline(panoramica, 120)

    // Steps should reference nodes from the critical path
    const nodeIds = timeline.map((s) => s.nodeId)
    expect(nodeIds).toContain('x1')
    expect(nodeIds).toContain('x2')
  })

  it('all steps have type = action', () => {
    const layer = makeLayer({
      id: 'l1',
      type: 'impasto',
      nodes: [makeNode({ id: 'n1', type: 'dough', data: { title: 'Do', baseDur: 15 } })],
      edges: [],
    })

    const panoramica = computePanoramica(staticProvider, [layer], [])
    const timeline = generateTimeline(panoramica, 60)

    for (const step of timeline) {
      expect(step.type).toBe('action')
    }
  })

  it('single empty layer: no steps generated', () => {
    const layer = makeLayer({ id: 'empty', type: 'prep', nodes: [], edges: [] })
    const panoramica = computePanoramica(staticProvider, [layer], [])
    const timeline = generateTimeline(panoramica, 100)

    // Empty layer has empty criticalPath, so no steps
    expect(timeline).toEqual([])
  })
})
