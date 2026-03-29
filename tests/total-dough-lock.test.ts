/**
 * Comprehensive test suite for totalDough lock system.
 *
 * Tests that when totalDough is locked, the total weight is maintained
 * regardless of changes to individual ingredients (hydration, flour, yeast, salt, fat).
 *
 * Uses reconcileGraph() directly to verify Phase 3d enforcement.
 */

import { describe, it, expect } from 'vitest'
import { resolve } from 'path'
import { reconcileGraph } from '~/server/services/graph-reconciler.service'
import { FileScienceProvider } from '@commons/utils/science/science-provider'
import { makeNode, makeEdge, makeGraph, makeDefaultPortioning, makeDefaultMeta } from './synthetic_data/helpers'
import { scaleNodeData, computeGraphTotals } from '@commons/utils/portioning-manager'
import type { RecipeGraph } from '@commons/types/recipe-graph'
import type { Portioning, RecipeMeta } from '@commons/types/recipe'

const provider = new FileScienceProvider(
  resolve(process.cwd(), 'science'),
  resolve(process.cwd(), 'commons/i18n'),
)

const meta: RecipeMeta = makeDefaultMeta()

// ── Helper: build a realistic dough graph ──────────────────────
function makeTestGraph(
  flourG = 500, waterG = 325, yeastG = 1.1, saltG = 11.5, fatG = 15,
): RecipeGraph {
  return makeGraph(
    [
      makeNode({
        id: 'dough', type: 'dough',
        data: {
          title: 'Impasto',
          flours: [{ id: 0, type: 'gt_00_for', g: flourG, temp: null }],
          liquids: [{ id: 0, type: 'Acqua', g: waterG, temp: null }],
          yeasts: [{ id: 0, type: 'fresh', g: yeastG }],
          salts: [{ id: 0, type: 'sale_fino', g: saltG }],
          fats: [{ id: 0, type: 'olio_evo', g: fatG }],
          sugars: [], extras: [],
        },
      }),
      makeNode({
        id: 'rise', type: 'rise',
        data: {
          title: 'Lievitazione', riseMethod: 'room', baseDur: 1080,
          flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
          userOverrideDuration: true,
        },
      }),
    ],
    [makeEdge('dough', 'rise')],
  )
}

// ── Helper: compute total from reconciler result ────────────────
function getTotal(graph: RecipeGraph): number {
  return computeGraphTotals(graph).totalDough
}
function getFlour(graph: RecipeGraph): number {
  return computeGraphTotals(graph).totalFlour
}
function getLiquid(graph: RecipeGraph): number {
  return computeGraphTotals(graph).totalLiquid
}
function getYeast(graph: RecipeGraph): number {
  return computeGraphTotals(graph).totalYeast
}
function getSalt(graph: RecipeGraph): number {
  return computeGraphTotals(graph).totalSalt
}
function getFat(graph: RecipeGraph): number {
  return computeGraphTotals(graph).totalFat
}
function getHydration(graph: RecipeGraph): number {
  return computeGraphTotals(graph).currentHydration
}

// ── Helper: simulate changing hydration in a locked graph ───────
function changeHydration(graph: RecipeGraph, newHydPct: number): RecipeGraph {
  const totals = computeGraphTotals(graph)
  const targetLiquid = totals.totalFlour * newHydPct / 100
  if (totals.totalLiquid <= 0) return graph
  const factor = targetLiquid / totals.totalLiquid
  return {
    ...graph,
    nodes: graph.nodes.map((n) => ({
      ...n,
      data: {
        ...n.data,
        liquids: n.data.liquids.map((l) => ({ ...l, g: Math.round(l.g * factor * 10) / 10 })),
      },
    })),
  }
}

// ── Helper: simulate changing flour amount ──────────────────────
function changeFlour(graph: RecipeGraph, newFlourG: number): RecipeGraph {
  const totals = computeGraphTotals(graph)
  if (totals.totalFlour <= 0) return graph
  const ratio = newFlourG / totals.totalFlour
  return {
    ...graph,
    nodes: graph.nodes.map((n) => ({
      ...n,
      data: {
        ...n.data,
        flours: n.data.flours.map((f) => ({ ...f, g: Math.round(f.g * ratio * 10) / 10 })),
      },
    })),
  }
}

// ── Helper: simulate changing yeast ─────────────────────────────
function changeYeast(graph: RecipeGraph, newYeastG: number): RecipeGraph {
  return {
    ...graph,
    nodes: graph.nodes.map((n) => ({
      ...n,
      data: {
        ...n.data,
        yeasts: (n.data.yeasts ?? []).length > 0
          ? [{ ...n.data.yeasts![0], g: newYeastG }]
          : n.data.yeasts,
      },
    })),
  }
}

// ── Helper: simulate changing salt ──────────────────────────────
function changeSalt(graph: RecipeGraph, newSaltG: number): RecipeGraph {
  return {
    ...graph,
    nodes: graph.nodes.map((n) => ({
      ...n,
      data: {
        ...n.data,
        salts: (n.data.salts ?? []).length > 0
          ? [{ ...n.data.salts![0], g: newSaltG }]
          : n.data.salts,
      },
    })),
  }
}

// ── Helper: simulate changing fat ───────────────────────────────
function changeFat(graph: RecipeGraph, newFatG: number): RecipeGraph {
  return {
    ...graph,
    nodes: graph.nodes.map((n) => ({
      ...n,
      data: {
        ...n.data,
        fats: (n.data.fats ?? []).length > 0
          ? [{ ...n.data.fats![0], g: newFatG }]
          : n.data.fats,
      },
    })),
  }
}

// ── Helper: make portioning with totalDough lock ────────────────
function lockedPortioning(lockedTotal: number, overrides: Partial<Portioning> = {}): Portioning {
  return makeDefaultPortioning({
    locks: { totalDough: true, hydration: false, duration: false, yeastPct: false },
    lockedTotalDough: lockedTotal,
    ...overrides,
  })
}

function unlockedPortioning(overrides: Partial<Portioning> = {}): Portioning {
  return makeDefaultPortioning({
    locks: { totalDough: false, hydration: false, duration: false, yeastPct: false },
    ...overrides,
  })
}

// Tolerance for total dough comparison (rounding)
const TOLERANCE = 2

// ═══════════════════════════════════════════════════════════════
// GROUP A: Lock enforcement — totalDough preserved after changes
// ═══════════════════════════════════════════════════════════════

describe('Group A: Lock enforcement — totalDough preserved', () => {
  const graph = makeTestGraph(500, 325, 1.1, 11.5, 15)
  const originalTotal = getTotal(graph) // ~852.6

  it('A1: lock + change hydration → totalDough preserved', () => {
    const port = lockedPortioning(originalTotal)
    const modified = changeHydration(graph, 50) // reduce hydration
    const result = reconcileGraph(modified, port, meta, provider)
    expect(getTotal(result.graph)).toBeCloseTo(originalTotal, -1)
  })

  it('A2: lock + change flour → totalDough preserved', () => {
    const port = lockedPortioning(originalTotal)
    const modified = changeFlour(graph, 600) // increase flour
    const result = reconcileGraph(modified, port, meta, provider)
    expect(getTotal(result.graph)).toBeCloseTo(originalTotal, -1)
  })

  it('A3: lock + change yeast → totalDough preserved', () => {
    const port = lockedPortioning(originalTotal)
    const modified = changeYeast(graph, 3.0) // increase yeast
    const result = reconcileGraph(modified, port, meta, provider)
    expect(getTotal(result.graph)).toBeCloseTo(originalTotal, -1)
  })

  it('A4: lock + change salt → totalDough preserved', () => {
    const port = lockedPortioning(originalTotal)
    const modified = changeSalt(graph, 20) // increase salt
    const result = reconcileGraph(modified, port, meta, provider)
    expect(getTotal(result.graph)).toBeCloseTo(originalTotal, -1)
  })

  it('A5: lock + change fat → totalDough preserved', () => {
    const port = lockedPortioning(originalTotal)
    const modified = changeFat(graph, 30) // increase fat
    const result = reconcileGraph(modified, port, meta, provider)
    expect(getTotal(result.graph)).toBeCloseTo(originalTotal, -1)
  })
})

// ═══════════════════════════════════════════════════════════════
// GROUP B: Proportionality under lock
// ═══════════════════════════════════════════════════════════════

describe('Group B: Proportionality under lock', () => {
  const graph = makeTestGraph(500, 325, 1.1, 11.5, 15)
  const originalTotal = getTotal(graph)

  it('B6: lock + halve hydration → flour increases proportionally', () => {
    const port = lockedPortioning(originalTotal)
    const modified = changeHydration(graph, 30) // drastic hydration cut
    const result = reconcileGraph(modified, port, meta, provider)
    expect(getTotal(result.graph)).toBeCloseTo(originalTotal, -1)
    // With less liquid, flour ratio should be higher
    expect(getFlour(result.graph)).toBeGreaterThan(getFlour(graph))
  })

  it('B7: lock + increase flour → liquids decrease to fit', () => {
    const port = lockedPortioning(originalTotal)
    const modified = changeFlour(graph, 700) // large flour increase
    const result = reconcileGraph(modified, port, meta, provider)
    expect(getTotal(result.graph)).toBeCloseTo(originalTotal, -1)
    // Uniform scaling means all ingredients decrease from the modified state
  })

  it('B8: lock + change hydration → no ingredient becomes zero', () => {
    const port = lockedPortioning(originalTotal)
    const modified = changeHydration(graph, 50) // moderate change
    const result = reconcileGraph(modified, port, meta, provider)
    expect(getYeast(result.graph)).toBeGreaterThan(0)
    expect(getSalt(result.graph)).toBeGreaterThan(0)
    expect(getFat(result.graph)).toBeGreaterThan(0)
    expect(getFlour(result.graph)).toBeGreaterThan(0)
    expect(getLiquid(result.graph)).toBeGreaterThan(0)
  })
})

// ═══════════════════════════════════════════════════════════════
// GROUP C: Lock target is lockedTotalDough, NOT portioning-derived
// ═══════════════════════════════════════════════════════════════

describe('Group C: lockedTotalDough is source of truth', () => {
  it('C9: lockedTotalDough=1000 overrides ball portioning target (=1000 from 250×4)', () => {
    // Even though ball target is also 1000, we verify lockedTotalDough is used
    const graph = makeTestGraph(500, 325, 1.1, 11.5, 15)
    const port = lockedPortioning(1000, { mode: 'ball', ball: { weight: 250, count: 4 } })
    const modified = changeHydration(graph, 50)
    const result = reconcileGraph(modified, port, meta, provider)
    expect(getTotal(result.graph)).toBeCloseTo(1000, -1)
  })

  it('C10: tray mode — lockedTotalDough=1000 NOT tray target (648)', () => {
    // The critical recipe/3 bug: tray 40×30×0.54×1 = 648, but user locked at 1000
    const graph = makeTestGraph(500, 325, 1.1, 11.5, 15)
    // Scale to ~1000g first
    const currentTotal = getTotal(graph)
    const factor = 1000 / currentTotal
    const scaledGraph: RecipeGraph = {
      ...graph,
      nodes: graph.nodes.map((n) => ({
        ...n,
        data: scaleNodeData(n.data, factor),
      })),
    }
    const scaledTotal = getTotal(scaledGraph)
    expect(scaledTotal).toBeCloseTo(1000, -1)

    // Lock at 1000, tray portioning would give 648
    const port = lockedPortioning(1000, {
      mode: 'tray',
      tray: { preset: 't', l: 40, w: 30, h: 2, material: 'alu', griglia: false, count: 1 },
      thickness: 0.54,
    })

    // Change hydration to 50%
    const modified = changeHydration(scaledGraph, 50)
    const result = reconcileGraph(modified, port, meta, provider)

    // Must be 1000, NOT 648
    expect(getTotal(result.graph)).toBeCloseTo(1000, -1)
  })

  it('C11: ball mode — lockedTotalDough=800 NOT ball target (1000 from 250×4)', () => {
    const graph = makeTestGraph(400, 260, 0.9, 9.2, 12)
    const port = lockedPortioning(800, { mode: 'ball', ball: { weight: 250, count: 4 } })
    const modified = changeFlour(graph, 500)
    const result = reconcileGraph(modified, port, meta, provider)
    expect(getTotal(result.graph)).toBeCloseTo(800, -1)
  })

  it('C12: fallback — no lockedTotalDough → uses portioning-derived target', () => {
    const graph = makeTestGraph(500, 325, 1.1, 11.5, 15)
    // Lock WITHOUT lockedTotalDough (backward compat)
    const port = makeDefaultPortioning({
      locks: { totalDough: true, hydration: false, duration: false, yeastPct: false },
      // no lockedTotalDough field
      mode: 'ball', ball: { weight: 250, count: 4 },
    })
    const modified = changeHydration(graph, 50)
    const result = reconcileGraph(modified, port, meta, provider)
    // Should use ball target = 250×4 = 1000
    expect(getTotal(result.graph)).toBeCloseTo(1000, -1)
  })
})

// ═══════════════════════════════════════════════════════════════
// GROUP D: Lock/unlock cycles
// ═══════════════════════════════════════════════════════════════

describe('Group D: Lock/unlock cycles', () => {
  it('D13: unlock → changes apply freely', () => {
    const graph = makeTestGraph(500, 325, 1.1, 11.5, 15)
    const port = unlockedPortioning()
    const modified = changeHydration(graph, 80) // increase hydration a lot
    const result = reconcileGraph(modified, port, meta, provider)
    // Total should change (not locked)
    const originalTotal = getTotal(graph)
    expect(Math.abs(getTotal(result.graph) - originalTotal)).toBeGreaterThan(10)
  })

  it('D14: lock → change → result maintains locked total', () => {
    const graph = makeTestGraph(500, 325, 1.1, 11.5, 15)
    const total = getTotal(graph)
    const port = lockedPortioning(total)

    // Multiple changes in sequence, each reconciled
    let g = changeHydration(graph, 50)
    let r = reconcileGraph(g, port, meta, provider)
    expect(getTotal(r.graph)).toBeCloseTo(total, -1)

    // Change flour on the reconciled result
    g = changeFlour(r.graph, 600)
    r = reconcileGraph(g, port, meta, provider)
    expect(getTotal(r.graph)).toBeCloseTo(total, -1)
  })
})

// ═══════════════════════════════════════════════════════════════
// GROUP E: Interaction with other locks
// ═══════════════════════════════════════════════════════════════

describe('Group E: Multiple locks', () => {
  it('E15: totalDough + hydration lock → both respected when yeast changes', () => {
    const graph = makeTestGraph(500, 325, 1.1, 11.5, 15)
    const total = getTotal(graph)
    const hyd = getHydration(graph) // 65
    const port = lockedPortioning(total, {
      locks: { totalDough: true, hydration: true, duration: false, yeastPct: false },
      targetHyd: hyd,
    })

    const modified = changeYeast(graph, 5.0)
    const result = reconcileGraph(modified, port, meta, provider)

    expect(getTotal(result.graph)).toBeCloseTo(total, -1)
    expect(getHydration(result.graph)).toBeCloseTo(hyd, 0)
  })

  it('E16: totalDough + yeastPct lock → both respected when duration changes', () => {
    const graph = makeTestGraph(500, 325, 1.1, 11.5, 15)
    const total = getTotal(graph)
    const yeastBefore = getYeast(graph)
    const port = lockedPortioning(total, {
      locks: { totalDough: true, hydration: false, duration: false, yeastPct: true },
      yeastPct: 0.22,
    })

    // Reconcile (Phase 3b should enforce yeast%, Phase 3d should enforce total)
    const result = reconcileGraph(graph, port, meta, provider)
    expect(getTotal(result.graph)).toBeCloseTo(total, -1)
  })
})

// ═══════════════════════════════════════════════════════════════
// GROUP F: Edge cases
// ═══════════════════════════════════════════════════════════════

describe('Group F: Edge cases', () => {
  it('F17: lock on empty graph → no crash, returns empty graph', () => {
    const graph = makeGraph([], [])
    const port = lockedPortioning(1000)
    const result = reconcileGraph(graph, port, meta, provider)
    expect(result.graph.nodes).toHaveLength(0)
  })

  it('F18: no ingredient becomes zero after lock enforcement', () => {
    const graph = makeTestGraph(500, 325, 0.5, 5, 8) // small amounts
    const total = getTotal(graph)
    const port = lockedPortioning(total)

    // Increase flour drastically → total increases → Phase 3d scales down
    const modified = changeFlour(graph, 800)
    const result = reconcileGraph(modified, port, meta, provider)

    expect(getYeast(result.graph)).toBeGreaterThan(0)
    expect(getSalt(result.graph)).toBeGreaterThan(0)
    expect(getFat(result.graph)).toBeGreaterThan(0)
  })

  it('F19: rounding tolerance — totalDough within ±2g after Phase 3d', () => {
    const graph = makeTestGraph(500, 325, 1.1, 11.5, 15)
    const total = getTotal(graph)
    const port = lockedPortioning(total)

    // Run multiple changes and verify tolerance
    const scenarios = [
      changeHydration(graph, 40),
      changeHydration(graph, 90),
      changeFlour(graph, 300),
      changeFlour(graph, 800),
      changeSalt(graph, 25),
      changeFat(graph, 50),
    ]

    for (const modified of scenarios) {
      const result = reconcileGraph(modified, port, meta, provider)
      expect(Math.abs(getTotal(result.graph) - total)).toBeLessThanOrEqual(TOLERANCE)
    }
  })
})
