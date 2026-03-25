/**
 * Generate a complete dough node graph from global settings.
 * Called when user clicks "Genera Impasto" on an empty recipe.
 */

import type { RecipeGraph, RecipeNode, RecipeEdge } from '@commons/types/recipe-graph'
import type { Portioning, RecipeMeta } from '@commons/types/recipe'
import { STEP_TYPES } from '@/local_data'
import { rnd } from '@commons/utils/recipe'
import { getBakingProfile, calcBakeDuration } from '@commons/utils/baking'
import { autoLayout } from './auto-layout'

interface GenerateOptions {
  meta: RecipeMeta
  portioning: Portioning
  totalDough: number
}

let idCounter = 0
function uid(prefix: string) {
  return `${prefix}_${(++idCounter).toString(36)}`
}

export function generateDoughGraph(opts: GenerateOptions): RecipeGraph {
  idCounter = 0
  const { meta, portioning, totalDough } = opts
  const { targetHyd, yeastPct, saltPct, fatPct, preImpasto, preFermento, doughHours } = portioning

  // Calculate ingredient amounts from composition
  const hyd = targetHyd / 100
  const divisor = 1 + hyd + yeastPct / 100 + saltPct / 100 + fatPct / 100
  const flourTotal = rnd(totalDough / divisor)
  const liquidTotal = rnd(flourTotal * hyd)
  const yeastTotal = rnd(flourTotal * yeastPct / 100)
  const saltTotal = rnd(flourTotal * saltPct / 100)
  const fatTotal = rnd(flourTotal * fatPct / 100)

  const nodes: RecipeNode[] = []
  const edges: RecipeEdge[] = []
  const group = 'Impasto'

  function addNode(n: RecipeNode) { nodes.push(n) }
  function addEdge(src: string, tgt: string, srcHandle?: string, tgtHandle?: string) {
    edges.push({
      id: `e_${src}__${tgt}`,
      source: src,
      target: tgt,
      sourceHandle: srcHandle,
      targetHandle: tgtHandle,
      data: { scheduleTimeRatio: 1, scheduleQtyRatio: 1 },
    })
  }

  // IDs for linking
  const doughId = uid('dough')
  const doughDeps: string[] = [] // nodes that feed into dough

  // ── Pre-Fermento ──
  if (preFermento) {
    const pfSubtype = STEP_TYPES.find(t => t.key === 'pre_ferment')?.subtypes?.find(s => s.key === preFermento)
    const pfDefaults = pfSubtype?.defaults || {}
    const pfPct = (pfDefaults.preFermentPct || 40) / 100
    const pfHyd = (pfDefaults.hydrationPct || 60) / 100

    const pfFlour = rnd(flourTotal * pfPct)
    const pfLiquid = rnd(pfFlour * pfHyd)
    const pfYeast = yeastTotal > 0 ? rnd(pfFlour * (pfDefaults.yeastPct || 1) / 100) : 0

    const pfId = uid('pf')
    addNode({
      id: pfId,
      type: 'pre_ferment',
      subtype: preFermento,
      position: { x: 0, y: 0 },
      lane: 'main',
      data: {
        title: pfSubtype?.label || 'Pre-fermento',
        desc: '',
        group,
        baseDur: 15,
        restDur: 0,
        restTemp: null,
        flours: [{ id: 0, type: 'gt_00_for', g: pfFlour, temp: null }],
        liquids: [{ id: 0, type: 'Acqua', g: pfLiquid, temp: null }],
        extras: [],
        yeasts: pfYeast > 0 ? [{ id: 0, type: 'fresh', g: pfYeast }] : [],
        salts: [], sugars: [], fats: [],
        preFermentCfg: {
          preFermentPct: pfDefaults.preFermentPct || 40,
          hydrationPct: pfDefaults.hydrationPct || 60,
          yeastType: 'fresh',
          yeastPct: pfDefaults.yeastPct || 1,
          fermentTemp: pfDefaults.fermentTemp || 18,
          fermentDur: pfDefaults.fermentDur || 720,
          roomTempDur: null,
          starterForm: null,
        },
      },
    })

    // Maturation step
    const matId = uid('mat')
    addNode({
      id: matId,
      type: 'rise',
      subtype: pfDefaults.fermentTemp && pfDefaults.fermentTemp < 10 ? 'fridge' : pfDefaults.fermentTemp && pfDefaults.fermentTemp <= 18 ? 'ctrl18' : 'room',
      position: { x: 0, y: 0 },
      lane: 'main',
      data: {
        title: `Maturazione ${pfSubtype?.label || 'Pre-fermento'}`,
        desc: '',
        group,
        baseDur: pfDefaults.fermentDur || 720,
        restDur: 0,
        restTemp: null,
        flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
        riseMethod: pfDefaults.fermentTemp && pfDefaults.fermentTemp < 10 ? 'fridge' : pfDefaults.fermentTemp && pfDefaults.fermentTemp <= 18 ? 'ctrl18' : 'room',
        sourcePrep: pfId,
      },
    })
    addEdge(pfId, matId)
    doughDeps.push(matId)
  }

  // ── Pre-Impasto ──
  if (preImpasto) {
    const piSubtype = STEP_TYPES.find(t => t.key === 'pre_dough')?.subtypes?.find(s => s.key === preImpasto)
    const piId = uid('pi')

    // For autolisi: use remaining flour (after pre-ferment) + 90% of remaining water
    const pfPct = preFermento
      ? (STEP_TYPES.find(t => t.key === 'pre_ferment')?.subtypes?.find(s => s.key === preFermento)?.defaults?.preFermentPct || 40) / 100
      : 0
    const piFlour = rnd(flourTotal * (1 - pfPct))
    const piLiquid = rnd(liquidTotal * (1 - pfPct) * 0.9) // 90% water for autolisi

    addNode({
      id: piId,
      type: 'pre_dough',
      subtype: preImpasto,
      position: { x: 0, y: 0 },
      lane: 'main',
      data: {
        title: piSubtype?.label || 'Pre-impasto',
        desc: '',
        group,
        baseDur: piSubtype?.defaults?.baseDur || 30,
        restDur: 0,
        restTemp: null,
        flours: [{ id: 0, type: 'gt_00_for', g: piFlour, temp: null }],
        liquids: [{ id: 0, type: 'Acqua', g: piLiquid, temp: null }],
        extras: [], yeasts: [], salts: [], sugars: [], fats: [],
      },
    })
    doughDeps.push(piId)
  }

  // ── Impasto (dough) ──
  // Remaining flour/liquid after pre-techniques
  let remainingFlour = flourTotal
  let remainingLiquid = liquidTotal
  let remainingYeast = yeastTotal
  for (const n of nodes) {
    remainingFlour -= n.data.flours.reduce((a, f) => a + f.g, 0)
    remainingLiquid -= n.data.liquids.reduce((a, l) => a + l.g, 0)
    remainingYeast -= (n.data.yeasts ?? []).reduce((a, y) => a + y.g, 0)
  }
  remainingFlour = Math.max(0, rnd(remainingFlour))
  remainingLiquid = Math.max(0, rnd(remainingLiquid))
  remainingYeast = Math.max(0, rnd(remainingYeast))

  addNode({
    id: doughId,
    type: 'dough',
    subtype: 'hand',
    position: { x: 0, y: 0 },
    lane: 'main',
    data: {
      title: preFermento || preImpasto ? 'Impasto Finale' : 'Impasto',
      desc: '',
      group,
      baseDur: 20,
      restDur: 0,
      restTemp: null,
      flours: remainingFlour > 0 ? [{ id: 0, type: 'gt_00_for', g: remainingFlour, temp: null }] : [],
      liquids: remainingLiquid > 0 ? [{ id: 0, type: 'Acqua', g: remainingLiquid, temp: null }] : [],
      extras: [],
      yeasts: remainingYeast > 0 ? [{ id: 0, type: 'fresh', g: remainingYeast }] : [],
      salts: saltTotal > 0 ? [{ id: 0, type: 'sale_fino', g: saltTotal }] : [],
      sugars: [],
      fats: fatTotal > 0 ? [{ id: 0, type: 'olio_evo', g: fatTotal }] : [],
      kneadMethod: 'hand',
    },
  })
  for (const depId of doughDeps) addEdge(depId, doughId)

  // ── 1ª Lievitazione ──
  const rise1Id = uid('rise')
  addNode({
    id: rise1Id,
    type: 'rise',
    subtype: 'room',
    position: { x: 0, y: 0 },
    lane: 'main',
    data: {
      title: '1ª Lievitazione',
      desc: '',
      group,
      baseDur: Math.max(30, Math.round(doughHours * 60 * 0.3)), // ~30% of total time for bulk
      restDur: 0,
      restTemp: null,
      flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
      riseMethod: 'room',
      sourcePrep: doughId,
    },
  })
  addEdge(doughId, rise1Id)

  // ── Formatura ──
  const shapeId = uid('shape')
  const ballCount = portioning.mode === 'ball' ? portioning.ball.count : 1
  addNode({
    id: shapeId,
    type: 'shape',
    subtype: null,
    position: { x: 0, y: 0 },
    lane: 'main',
    data: {
      title: portioning.mode === 'tray' ? 'Stesura in Teglia' : 'Formatura',
      desc: '',
      group,
      baseDur: 10,
      restDur: 0,
      restTemp: null,
      flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
      shapeCount: ballCount,
    },
  })
  addEdge(rise1Id, shapeId)

  let lastId = shapeId

  // ── Lievitazione in Teglia (only for tray mode) ──
  if (portioning.mode === 'tray') {
    const rise2Id = uid('rise2')
    addNode({
      id: rise2Id,
      type: 'rise',
      subtype: 'room',
      position: { x: 0, y: 0 },
      lane: 'main',
      data: {
        title: 'Lievitazione in Teglia',
        desc: '',
        group,
        baseDur: Math.max(30, Math.round(doughHours * 60 * 0.2)),
        restDur: 0,
        restTemp: null,
        flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
        riseMethod: 'room',
        sourcePrep: doughId,
      },
    })
    addEdge(shapeId, rise2Id)
    lastId = rise2Id
  }

  // ── Cottura (from BakingProfile) ──
  const bakeId = uid('bake')
  const bakeProfile = getBakingProfile(meta.type, meta.subtype)
  const bakeMaterial = portioning.tray.material || 'alu'
  const bakeTemp = bakeProfile?.refTemp ?? 220
  const bakeCieloMin = bakeProfile?.cieloPctRange?.[0] ?? 40
  const bakeCieloMax = bakeProfile?.cieloPctRange?.[1] ?? 60
  const bakeCielo = Math.round((bakeCieloMin + bakeCieloMax) / 2)
  const bakeMode = bakeProfile?.recommendedModes?.[0] ?? 'static'

  const bakeOvenCfg = {
    panType: bakeMaterial,
    ovenType: 'electric',
    ovenMode: bakeMode,
    temp: bakeTemp,
    cieloPct: bakeCielo,
    shelfPosition: 2,
  }

  // Calculate baseDur to match the profile's calculated duration (no mismatch warning)
  const bakeDur = bakeProfile
    ? calcBakeDuration(bakeProfile, bakeOvenCfg, portioning.thickness)
    : 30

  addNode({
    id: bakeId,
    type: 'bake',
    subtype: null,
    position: { x: 0, y: 0 },
    lane: 'main',
    data: {
      title: 'Cottura',
      desc: '',
      group,
      baseDur: bakeDur,
      restDur: 0,
      restTemp: null,
      flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
      ovenCfg: bakeOvenCfg,
    },
  })
  addEdge(lastId, bakeId)

  // ── Fine ──
  const doneId = uid('done')
  addNode({
    id: doneId,
    type: 'done',
    subtype: null,
    position: { x: 0, y: 0 },
    lane: 'main',
    data: {
      title: 'Buon Appetito!',
      desc: '',
      group,
      baseDur: 0,
      restDur: 0,
      restTemp: null,
      flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
    },
  })
  addEdge(bakeId, doneId)

  return autoLayout({
    nodes,
    edges,
    lanes: [{ id: 'main', label: 'Panificazione', isMain: true, origin: { type: 'user' } }],
  })
}
