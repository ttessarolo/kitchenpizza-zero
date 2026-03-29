import { describe, it, expect } from 'vitest'
import { resolve } from 'path'
import { reconcileGraph } from '~/server/services/graph-reconciler.service'
import { FileScienceProvider } from '@commons/utils/science/science-provider'
import { makeNode, makeEdge, makeGraph, makeDoughNodeWithFlour, makeRiseNode, makeDefaultPortioning, makeDefaultMeta } from './synthetic_data/helpers'
import type { RecipeGraph } from '@commons/types/recipe-graph'
import type { Portioning, RecipeMeta } from '@commons/types/recipe'

const provider = new FileScienceProvider(
  resolve(process.cwd(), 'science'),
  resolve(process.cwd(), 'commons/i18n'),
)

const defaultPortioning: Portioning = {
  mode: 'ball', tray: { preset: 't', l: 40, w: 30, h: 2, material: 'alu', griglia: false, count: 1 },
  ball: { weight: 250, count: 4 }, thickness: 0.5, targetHyd: 65,
  doughHours: 18, yeastPct: 0.22, saltPct: 2.3, fatPct: 3,
  preImpasto: null, preFermento: null, flourMix: [], autoCorrect: false, reasoningLevel: 'medium',
}
const defaultMeta: RecipeMeta = { name: 'Test', author: '', type: 'pane', subtype: 'pane_comune', locale: 'it' }

function makeSimpleGraph(flourG: number, waterG: number, yeastG: number, saltG = 0, fatG = 0): RecipeGraph {
  return makeGraph(
    [
      makeNode({
        id: 'dough', type: 'dough',
        data: {
          title: 'Impasto', desc: '', group: 'Impasto', baseDur: 20, restDur: 0, restTemp: null,
          flours: [{ id: 0, type: 'gt_00_for', g: flourG, temp: null }],
          liquids: [{ id: 0, type: 'Acqua', g: waterG, temp: null }],
          extras: [], yeasts: yeastG > 0 ? [{ id: 0, type: 'fresh', g: yeastG }] : [],
          salts: saltG > 0 ? [{ id: 0, type: 'sale_fino', g: saltG }] : [],
          sugars: [], fats: fatG > 0 ? [{ id: 0, type: 'olio_evo', g: fatG }] : [],
          kneadMethod: 'hand',
        },
      }),
      makeNode({
        id: 'rise', type: 'rise',
        data: {
          title: '1ª Lievitazione', desc: '', group: 'Impasto', baseDur: 120, restDur: 0, restTemp: null,
          flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
          riseMethod: 'room', sourcePrep: 'dough', userOverrideDuration: false,
        },
      }),
      makeNode({
        id: 'bake', type: 'bake',
        data: {
          title: 'Cottura', desc: '', group: 'Impasto', baseDur: 30, restDur: 0, restTemp: null,
          flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
          ovenCfg: { panType: 'alu', ovenType: 'electric', ovenMode: 'static', temp: 210, cieloPct: 50, shelfPosition: 2 },
          userOverrideDuration: false,
        },
      }),
      makeNode({
        id: 'done', type: 'done',
        data: { title: 'Fine', desc: '', group: 'Impasto', baseDur: 0, restDur: 0, restTemp: null, flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [] },
      }),
    ],
    [
      makeEdge('dough', 'rise'),
      makeEdge('rise', 'bake'),
      makeEdge('bake', 'done'),
    ],
  )
}

describe('reconcileGraph — yeast → rise duration', () => {
  it('recalculates rise duration when yeast is present', () => {
    // 500g flour, 1% yeast = 5g → should produce a specific rise duration
    const graph = makeSimpleGraph(500, 300, 5)
    const result = reconcileGraph(graph, defaultPortioning, defaultMeta, provider)

    const rise = result.graph.nodes.find((n) => n.id === 'rise')!
    // With 1% yeast, room temp, W280 flour → should be different from the initial 120 min
    expect(rise.data.baseDur).toBeGreaterThan(0)
    expect(rise.data.baseDur).not.toBe(120) // reconciler changed it
  })

  it('more yeast → shorter rise', () => {
    const graphLow = makeSimpleGraph(500, 300, 1)   // 0.2% yeast
    const graphHigh = makeSimpleGraph(500, 300, 10)  // 2% yeast

    const resultLow = reconcileGraph(graphLow, defaultPortioning, defaultMeta, provider)
    const resultHigh = reconcileGraph(graphHigh, defaultPortioning, defaultMeta, provider)

    const riseLow = resultLow.graph.nodes.find((n) => n.id === 'rise')!
    const riseHigh = resultHigh.graph.nodes.find((n) => n.id === 'rise')!

    // More yeast → shorter rise
    expect(riseHigh.data.baseDur).toBeLessThan(riseLow.data.baseDur)
  })
})

describe('reconcileGraph — userOverrideDuration', () => {
  it('respects user override on rise', () => {
    const graph = makeSimpleGraph(500, 300, 5)
    // Set userOverride on rise node
    const riseNode = graph.nodes.find((n) => n.id === 'rise')!
    riseNode.data.baseDur = 999
    riseNode.data.userOverrideDuration = true

    const result = reconcileGraph(graph, defaultPortioning, defaultMeta, provider)
    const rise = result.graph.nodes.find((n) => n.id === 'rise')!
    expect(rise.data.baseDur).toBe(999) // NOT recalculated
  })

  it('recalculates when userOverride is false', () => {
    const graph = makeSimpleGraph(500, 300, 5)
    const riseNode = graph.nodes.find((n) => n.id === 'rise')!
    riseNode.data.baseDur = 999
    riseNode.data.userOverrideDuration = false

    const result = reconcileGraph(graph, defaultPortioning, defaultMeta, provider)
    const rise = result.graph.nodes.find((n) => n.id === 'rise')!
    expect(rise.data.baseDur).not.toBe(999) // WAS recalculated
  })
})

describe('reconcileGraph — salt/fat factors', () => {
  it('more salt → longer rise', () => {
    const graphNormal = makeSimpleGraph(500, 300, 5, 12)  // 2.4% salt
    const graphHighSalt = makeSimpleGraph(500, 300, 5, 20) // 4% salt

    const resultNormal = reconcileGraph(graphNormal, defaultPortioning, defaultMeta, provider)
    const resultHigh = reconcileGraph(graphHighSalt, defaultPortioning, defaultMeta, provider)

    const riseNormal = resultNormal.graph.nodes.find((n) => n.id === 'rise')!
    const riseHigh = resultHigh.graph.nodes.find((n) => n.id === 'rise')!

    expect(riseHigh.data.baseDur).toBeGreaterThanOrEqual(riseNormal.data.baseDur)
  })

  it('more fat → longer rise', () => {
    const graphNoFat = makeSimpleGraph(500, 300, 5, 12, 0)
    const graphHighFat = makeSimpleGraph(500, 300, 5, 12, 75) // 15% fat

    const resultNoFat = reconcileGraph(graphNoFat, defaultPortioning, defaultMeta, provider)
    const resultHigh = reconcileGraph(graphHighFat, defaultPortioning, defaultMeta, provider)

    const riseNoFat = resultNoFat.graph.nodes.find((n) => n.id === 'rise')!
    const riseHigh = resultHigh.graph.nodes.find((n) => n.id === 'rise')!

    expect(riseHigh.data.baseDur).toBeGreaterThanOrEqual(riseNoFat.data.baseDur)
  })
})

describe('reconcileGraph — fridge rise factor', () => {
  it('fridge rise is much longer than room rise', () => {
    const graphRoom = makeSimpleGraph(500, 300, 5)
    const graphFridge = makeSimpleGraph(500, 300, 5)
    graphFridge.nodes.find((n) => n.id === 'rise')!.data.riseMethod = 'fridge'

    const resultRoom = reconcileGraph(graphRoom, defaultPortioning, defaultMeta, provider)
    const resultFridge = reconcileGraph(graphFridge, defaultPortioning, defaultMeta, provider)

    const riseRoom = resultRoom.graph.nodes.find((n) => n.id === 'rise')!
    const riseFridge = resultFridge.graph.nodes.find((n) => n.id === 'rise')!

    // Fridge tf = 3.6 → should be roughly 3x longer
    expect(riseFridge.data.baseDur).toBeGreaterThan(riseRoom.data.baseDur * 2)
  })
})

describe('reconcileGraph — split validation', () => {
  it('warns if split outputs do not sum to 100%', () => {
    const graph = makeGraph(
      [makeNode({
        id: 'split', type: 'split',
        data: {
          title: 'Dividi', desc: '', group: 'Impasto', baseDur: 5, restDur: 0, restTemp: null,
          flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
          splitMode: 'pct',
          splitOutputs: [
            { handle: 'out_0', label: 'A', value: 60 },
            { handle: 'out_1', label: 'B', value: 30 },
          ],
        },
      })],
      [],
    )
    const result = reconcileGraph(graph, defaultPortioning, defaultMeta, provider)
    expect(result.warnings.some((w) => w.id.includes('split_sum'))).toBe(true)
  })
})

describe('reconcileGraph — portioning preserved', () => {
  it('does NOT overwrite portioning from graph totals', () => {
    const graph = makeSimpleGraph(400, 240, 2, 8, 16) // total ~666g
    const po = { ...defaultPortioning, mode: 'ball' as const, ball: { weight: 250, count: 4 } }

    const result = reconcileGraph(graph, po, defaultMeta, provider)

    // Portioning is the user's source of truth — reconciler preserves it
    expect(result.portioning.ball.weight).toBe(250) // unchanged
  })
})

describe('reconcileGraph — warnings', () => {
  it('empty graph produces no warnings', () => {
    const result = reconcileGraph(makeGraph([], []), defaultPortioning, defaultMeta, provider)
    expect(result.warnings).toHaveLength(0)
  })

  it('autolisi + preferment + high hydration warning', () => {
    const graph = makeGraph(
      [
        makeNode({ id: 'auto', type: 'pre_dough', subtype: 'autolisi', data: { title: 'Autolisi', desc: '', group: 'Impasto', baseDur: 30, restDur: 0, restTemp: null, flours: [{ id: 0, type: 'gt_00_for', g: 300, temp: null }], liquids: [{ id: 0, type: 'Acqua', g: 250, temp: null }], extras: [], yeasts: [], salts: [], sugars: [], fats: [] } }),
        makeNode({ id: 'pf', type: 'pre_ferment', subtype: 'biga', data: { title: 'Biga', desc: '', group: 'Impasto', baseDur: 15, restDur: 0, restTemp: null, flours: [{ id: 0, type: 'gt_00_for', g: 200, temp: null }], liquids: [{ id: 0, type: 'Acqua', g: 170, temp: null }], extras: [], yeasts: [], salts: [], sugars: [], fats: [] } }),
      ],
      [],
    )
    // Hydration: (250+170)/(300+200) = 420/500 = 84% > 78%
    const result = reconcileGraph(graph, { ...defaultPortioning, targetHyd: 84 }, defaultMeta, provider)
    expect(result.warnings.some((w) => w.id === 'autolisi_preferment_hyd')).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════
// Warning deduplication: canonical + per-node markers
// ═══════════════════════════════════════════════════════════════════

describe('reconcileGraph — canonical + per-node warning emission', () => {
  it('NODE_LEVEL rule emits 1 canonical + N per-node markers', () => {
    // Use weak flour (gt_00_deb, W~170) + 3 long rise nodes to trigger equivalent_time_exceeds_w_capacity
    const dough = makeDoughNodeWithFlour('d1', 'gt_00_deb', 500)
    const r1 = makeRiseNode('r1', 480, 'room', { data: { title: 'Puntata', riseMethod: 'room', baseDur: 480, userOverrideDuration: true } }) // 8h room
    const r2 = makeRiseNode('r2', 480, 'room', { data: { title: 'Appretto', riseMethod: 'room', baseDur: 480, userOverrideDuration: true } }) // 8h room
    const r3 = makeRiseNode('r3', 480, 'room', { data: { title: 'Finale', riseMethod: 'room', baseDur: 480, userOverrideDuration: true } }) // 8h room
    // Total equiv = 24h room → will exceed W~170 max capacity
    const graph = makeGraph(
      [dough, r1, r2, r3],
      [makeEdge('d1', 'r1'), makeEdge('r1', 'r2'), makeEdge('r2', 'r3')],
    )
    const portioning = makeDefaultPortioning({ doughHours: 24, yeastPct: 0.1 })
    const result = reconcileGraph(graph, portioning, makeDefaultMeta(), provider)

    const capacityWarnings = result.warnings.filter((w) =>
      w.messageKey === 'warning.equivalent_time_exceeds_w_capacity',
    )

    // Should have: 1 canonical (no sourceNodeId) + 3 per-node markers (with sourceNodeId)
    const canonical = capacityWarnings.filter((w) => !w.sourceNodeId)
    const markers = capacityWarnings.filter((w) => !!w.sourceNodeId)

    expect(canonical.length).toBe(1)
    expect(markers.length).toBe(3)
    // Canonical retains actions from the rule
    // Per-node markers have actions stripped
    expect(markers.every((m) => !m.actions || m.actions.length === 0)).toBe(true)
    // Each marker has a unique sourceNodeId
    const nodeIds = markers.map((m) => m.sourceNodeId)
    expect(new Set(nodeIds).size).toBe(3)
  })

  it('non-NODE_LEVEL rule emits exactly 1 warning', () => {
    // total_fermentation_mismatch: doughHours very different from actual graph
    const dough = makeDoughNodeWithFlour('d1', 'gt_00_for', 500)
    const r1 = makeRiseNode('r1', 60, 'room', { data: { title: 'Puntata', riseMethod: 'room', baseDur: 60, userOverrideDuration: true } })
    const graph = makeGraph(
      [dough, r1],
      [makeEdge('d1', 'r1')],
    )
    // 1h room equiv vs doughHours=48 → huge mismatch
    const portioning = makeDefaultPortioning({ doughHours: 48, yeastPct: 0.05 })
    const result = reconcileGraph(graph, portioning, makeDefaultMeta(), provider)

    const mismatch = result.warnings.filter((w) =>
      w.messageKey === 'warning.total_fermentation_mismatch',
    )
    expect(mismatch.length).toBe(1)
    expect(mismatch[0].sourceNodeId).toBeUndefined()
  })
})

describe('reconcileGraph — sourceNodeId on all warning types', () => {
  it('dough composition warnings have sourceNodeId', () => {
    const graph = makeSimpleGraph(500, 325, 0.01, 1, 0) // very low yeast
    const result = reconcileGraph(graph, { ...defaultPortioning, yeastPct: 0.001 }, defaultMeta, provider)
    // yeast_too_low should have sourceNodeId = dough
    const yeastWarning = result.warnings.find((w) => w.id === 'yeast_too_low')
    if (yeastWarning) {
      expect(yeastWarning.sourceNodeId).toBe('dough')
    }
  })

  it('flour_w_max_rise has sourceNodeId and actions', () => {
    const dough = makeDoughNodeWithFlour('d1', 'gt_00_deb', 500) // weak flour
    const rise = makeRiseNode('r1', 1440, 'room', {
      data: { title: 'Long', riseMethod: 'room', baseDur: 1440, userOverrideDuration: true },
    })
    const graph = makeGraph([dough, rise], [makeEdge('d1', 'r1')])
    const result = reconcileGraph(graph, makeDefaultPortioning({ doughHours: 24 }), makeDefaultMeta(), provider)

    const w = result.warnings.find((w) => w.messageKey === 'flour_w_max_rise')
    expect(w).toBeDefined()
    expect(w!.sourceNodeId).toBe('r1')
    expect(w!.actions).toBeDefined()
    expect(w!.actions!.length).toBeGreaterThan(0)
    expect(w!._ctx?._maxBaseDur).toBeDefined()
  })
})
