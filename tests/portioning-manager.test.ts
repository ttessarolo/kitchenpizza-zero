import { describe, it, expect } from 'vitest'
import {
  calcTargetWeight,
  getNodeTotalWeight,
  computeGraphTotals,
  scaleNodeData,
  scaleAllNodes,
  scaleToHydration,
  applyPortioning,
} from '@commons/utils/portioning-manager'
import { makeNode, makeEdge, makeGraph } from './synthetic_data/helpers'
import type { Portioning } from '@commons/types/recipe'
import type { NodeData } from '@commons/types/recipe-graph'

const ballPortioning: Portioning = {
  mode: 'ball',
  tray: { preset: 't', l: 40, w: 30, h: 2, material: 'alu', griglia: false, count: 1 },
  ball: { weight: 250, count: 4 },
  thickness: 0.5,
  targetHyd: 65, doughHours: 18, yeastPct: 0.22, saltPct: 2.3, fatPct: 3,
  preImpasto: null, preFermento: null,
}

const trayPortioning: Portioning = {
  ...ballPortioning,
  mode: 'tray',
  tray: { preset: 't', l: 40, w: 30, h: 2, material: 'alu', griglia: false, count: 1 },
  thickness: 0.5,
}

const doughNodeData: NodeData = {
  title: 'Impasto', desc: '', group: 'Impasto', baseDur: 20, restDur: 0, restTemp: null,
  flours: [{ id: 0, type: 'gt_00_for', g: 500, temp: null }],
  liquids: [{ id: 0, type: 'Acqua', g: 300, temp: null }],
  extras: [], yeasts: [{ id: 0, type: 'fresh', g: 2 }],
  salts: [{ id: 0, type: 'sale_fino', g: 12 }], sugars: [], fats: [],
}

// ═══════════════════════════════════════════════════════════════
// calcTargetWeight
// ═══════════════════════════════════════════════════════════════

describe('PortioningManager — calcTargetWeight', () => {
  it('ball mode: weight × count', () => {
    expect(calcTargetWeight(ballPortioning)).toBe(1000) // 250 × 4
  })

  it('tray mode: l × w × thickness × count', () => {
    expect(calcTargetWeight(trayPortioning)).toBe(600) // 40 × 30 × 0.5 × 1
  })

  it('multiple trays multiply', () => {
    const multi = { ...trayPortioning, tray: { ...trayPortioning.tray, count: 2 } }
    expect(calcTargetWeight(multi)).toBe(1200)
  })
})

// ═══════════════════════════════════════════════════════════════
// getNodeTotalWeight
// ═══════════════════════════════════════════════════════════════

describe('PortioningManager — getNodeTotalWeight', () => {
  it('sums all ingredient weights', () => {
    const w = getNodeTotalWeight(doughNodeData)
    expect(w).toBe(500 + 300 + 2 + 12) // flour + liquid + yeast + salt
  })

  it('returns 0 for empty node', () => {
    const empty: NodeData = {
      title: '', desc: '', group: '', baseDur: 0, restDur: 0, restTemp: null,
      flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
    }
    expect(getNodeTotalWeight(empty)).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════
// computeGraphTotals
// ═══════════════════════════════════════════════════════════════

describe('PortioningManager — computeGraphTotals', () => {
  it('computes totals from dough nodes only', () => {
    const graph = makeGraph(
      [
        makeNode({ id: 'dough', type: 'dough', data: doughNodeData }),
        makeNode({ id: 'rise', type: 'rise', data: { ...doughNodeData, title: 'Rise' } }),
        makeNode({ id: 'bake', type: 'bake', data: { ...doughNodeData, title: 'Bake' } }),
      ],
      [makeEdge('dough', 'rise'), makeEdge('rise', 'bake')],
    )
    const t = computeGraphTotals(graph)
    // Only 'dough' counts (rise and bake are not DOUGH_NODE_TYPES)
    expect(t.totalFlour).toBe(500)
    expect(t.totalLiquid).toBe(300)
    expect(t.currentHydration).toBe(60) // 300/500 * 100
  })

  it('includes pre_ferment nodes in totals', () => {
    const pfData: NodeData = {
      ...doughNodeData, title: 'Biga',
      flours: [{ id: 0, type: 'gt_00_for', g: 200, temp: null }],
      liquids: [{ id: 0, type: 'Acqua', g: 88, temp: null }],
      yeasts: [], salts: [], sugars: [], fats: [],
    }
    const graph = makeGraph(
      [
        makeNode({ id: 'pf', type: 'pre_ferment', data: pfData }),
        makeNode({ id: 'dough', type: 'dough', data: doughNodeData }),
      ],
      [makeEdge('pf', 'dough')],
    )
    const t = computeGraphTotals(graph)
    expect(t.totalFlour).toBe(500 + 200) // dough + pre_ferment
    expect(t.totalLiquid).toBe(300 + 88)
  })
})

// ═══════════════════════════════════════════════════════════════
// scaleNodeData
// ═══════════════════════════════════════════════════════════════

describe('PortioningManager — scaleNodeData', () => {
  it('scales all ingredients by factor', () => {
    const scaled = scaleNodeData(doughNodeData, 2)
    expect(scaled.flours[0].g).toBe(1000) // 500 × 2
    expect(scaled.liquids[0].g).toBe(600) // 300 × 2
    expect(scaled.salts![0].g).toBe(24)   // 12 × 2
  })

  it('preserves extras with unit', () => {
    const data: NodeData = {
      ...doughNodeData,
      extras: [{ id: 0, name: 'Malto', g: 5, unit: undefined as any }, { id: 1, name: 'Uova', g: 2, unit: 'pz' }],
    }
    const scaled = scaleNodeData(data, 2)
    expect(scaled.extras[0].g).toBe(10) // scaled
    expect(scaled.extras[1].g).toBe(2)  // preserved (has unit)
  })
})

// ═══════════════════════════════════════════════════════════════
// scaleAllNodes & scaleToHydration
// ═══════════════════════════════════════════════════════════════

describe('PortioningManager — scaleAllNodes', () => {
  it('scales to new target', () => {
    const nodes = [makeNode({ id: 'dough', type: 'dough', data: doughNodeData })]
    const scaled = scaleAllNodes(nodes, 1628, 814) // 2x
    expect(scaled[0].data.flours[0].g).toBe(1000)
  })

  it('returns unchanged for zero current total', () => {
    const nodes = [makeNode({ id: 'dough', type: 'dough', data: doughNodeData })]
    const result = scaleAllNodes(nodes, 1000, 0)
    expect(result[0].data.flours[0].g).toBe(500) // unchanged
  })
})

describe('PortioningManager — scaleToHydration', () => {
  it('adjusts liquids to target hydration', () => {
    const nodes = [makeNode({ id: 'dough', type: 'dough', data: doughNodeData })]
    // Current: 300/500 = 60%. Target: 70%
    const scaled = scaleToHydration(nodes, 70)
    const newLiquid = scaled[0].data.liquids[0].g
    // 500 * 70/100 = 350
    expect(newLiquid).toBe(350)
  })

  it('does not change flours', () => {
    const nodes = [makeNode({ id: 'dough', type: 'dough', data: doughNodeData })]
    const scaled = scaleToHydration(nodes, 80)
    expect(scaled[0].data.flours[0].g).toBe(500) // unchanged
  })
})

// ═══════════════════════════════════════════════════════════════
// applyPortioning
// ═══════════════════════════════════════════════════════════════

describe('PortioningManager — applyPortioning', () => {
  it('scales graph to match new portioning target', () => {
    const graph = makeGraph(
      [makeNode({ id: 'dough', type: 'dough', data: doughNodeData })],
      [],
    )
    // Current total: 500+300+2+12 = 814g. Target: 1000g (4×250)
    const result = applyPortioning(graph, ballPortioning)
    const newFlour = result.graph.nodes[0].data.flours[0].g
    // factor ≈ 1000/814 ≈ 1.228
    expect(newFlour).toBeGreaterThan(500)
    expect(newFlour).toBeLessThan(700)
    expect(result.factor).toBeCloseTo(1000 / 814, 1)
  })

  it('returns unchanged graph for zero total', () => {
    const emptyData: NodeData = {
      title: '', desc: '', group: '', baseDur: 0, restDur: 0, restTemp: null,
      flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
    }
    const graph = makeGraph([makeNode({ id: 'dough', type: 'dough', data: emptyData })], [])
    const result = applyPortioning(graph, ballPortioning)
    expect(result.factor).toBe(1)
  })
})
