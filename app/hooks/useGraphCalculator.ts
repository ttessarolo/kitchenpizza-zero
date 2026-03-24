/**
 * Graph-based recipe calculator (v2).
 *
 * Provides the same computed values as useRecipeCalculator but operates on
 * RecipeV2 (graph: nodes[] + edges[]) instead of Recipe (steps[] + deps[]).
 */

import { useMemo } from 'react'
import type {
  RecipeV2,
  RecipeGraph,
  RecipeNode,
  NodeData,
  ScheduledNode,
} from '@commons/types/recipe-graph'
import type {
  TimeSummary,
  FlourIngredient,
  LiquidIngredient,
  ExtraIngredient,
  YeastIngredient,
  SaltIngredient,
  SugarIngredient,
  FatIngredient,
} from '@commons/types/recipe'
import { rnd } from '@commons/utils/recipe'
import { topologicalSortGraph, getNodeTotalWeight } from '@commons/utils/graph-utils'
import { getBakingProfile, calcBakeDuration } from '@commons/utils/baking'

// ── Grouped ingredients type ──────────────────────────────────────
export interface GroupedIngredients {
  flours: FlourIngredient[]
  liquids: LiquidIngredient[]
  extras: ExtraIngredient[]
  yeasts: YeastIngredient[]
  salts: SaltIngredient[]
  sugars: SugarIngredient[]
  fats: FatIngredient[]
}

// ── Node types that contribute to "dough" (not prep/post_bake) ──
const DOUGH_NODE_TYPES = new Set([
  'pre_dough', 'pre_ferment', 'dough', 'rest', 'rise', 'shape',
  'pre_bake', 'bake', 'done', 'split', 'join',
])

// ── Duration calculation ────────────────────────────────────────

export function getNodeDuration(
  node: RecipeNode,
  recipeType: string,
  recipeSubtype: string,
  thickness: number,
): number {
  const d = node.data
  const rest = d.restDur || 0

  if (node.type === 'bake' && d.ovenCfg) {
    const profile = getBakingProfile(recipeType, recipeSubtype)
    if (profile) {
      return calcBakeDuration(profile, d.ovenCfg, thickness) + rest
    }
  }

  return d.baseDur + rest
}

// ── Totals from graph (excluding prep nodes) ────────────────────

interface GraphTotals {
  totalFlour: number
  totalLiquid: number
  totalExtras: number
  totalYeast: number
  totalSalt: number
  totalSugar: number
  totalFat: number
  totalDough: number
  currentHydration: number
}

export function computeGraphTotals(graph: RecipeGraph): GraphTotals {
  let totalFlour = 0
  let totalLiquid = 0
  let totalExtras = 0
  let totalYeast = 0
  let totalSalt = 0
  let totalSugar = 0
  let totalFat = 0

  for (const n of graph.nodes) {
    // Exclude prep nodes from dough totals
    if (!DOUGH_NODE_TYPES.has(n.type)) continue

    const d = n.data
    totalFlour += d.flours.reduce((a, f) => a + f.g, 0)
    totalLiquid += d.liquids.reduce((a, l) => a + l.g, 0)
    totalExtras += d.extras.reduce((a, e) => a + (e.unit ? 0 : e.g), 0)
    totalYeast += (d.yeasts ?? []).reduce((a, y) => a + y.g, 0)
    totalSalt += (d.salts ?? []).reduce((a, x) => a + x.g, 0)
    totalSugar += (d.sugars ?? []).reduce((a, x) => a + x.g, 0)
    totalFat += (d.fats ?? []).reduce((a, x) => a + x.g, 0)
  }

  const totalDough = totalFlour + totalLiquid + totalExtras + totalYeast + totalSalt + totalSugar + totalFat
  const currentHydration = totalFlour > 0 ? Math.round((totalLiquid / totalFlour) * 100) : 0

  return { totalFlour, totalLiquid, totalExtras, totalYeast, totalSalt, totalSugar, totalFat, totalDough, currentHydration }
}

// ── Grouped ingredients ─────────────────────────────────────────

export function computeGroupedIngredients(
  graph: RecipeGraph,
  ingredientGroups: string[],
): Record<string, GroupedIngredients> {
  const g: Record<string, GroupedIngredients> = {}
  for (const grp of ingredientGroups) {
    g[grp] = { flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [] }
  }

  for (const n of graph.nodes) {
    const gr = g[n.data.group]
    if (!gr) continue
    const d = n.data

    for (const f of d.flours) {
      const e = gr.flours.find((x) => x.type === f.type)
      if (e) e.g += f.g
      else gr.flours.push({ ...f })
    }
    for (const l of d.liquids) {
      const e = gr.liquids.find((x) => x.type === l.type)
      if (e) e.g += l.g
      else gr.liquids.push({ ...l })
    }
    for (const x of d.extras) {
      const e = gr.extras.find((z) => z.name === x.name)
      if (e) e.g += x.g
      else gr.extras.push({ ...x })
    }
    for (const y of d.yeasts ?? []) {
      const e = gr.yeasts.find((x) => x.type === y.type)
      if (e) e.g += y.g
      else gr.yeasts.push({ ...y })
    }
    for (const s of d.salts ?? []) {
      const e = gr.salts.find((x) => x.type === s.type)
      if (e) e.g += s.g
      else gr.salts.push({ ...s })
    }
    for (const s of d.sugars ?? []) {
      const e = gr.sugars.find((x) => x.type === s.type)
      if (e) e.g += s.g
      else gr.sugars.push({ ...s })
    }
    for (const f of d.fats ?? []) {
      const e = gr.fats.find((x) => x.type === f.type)
      if (e) e.g += f.g
      else gr.fats.push({ ...f })
    }
  }

  return g
}

// ── Timeline / scheduling ───────────────────────────────────────

export interface NodesWithDuration {
  nodes: (RecipeNode & { dur: number })[]
  span: number
}

export function computeSchedule(
  graph: RecipeGraph,
  recipeType: string,
  recipeSubtype: string,
  thickness: number,
): NodesWithDuration {
  const sorted = topologicalSortGraph(graph)
  const nodesWithDur = sorted.map((n) => ({
    ...n,
    dur: getNodeDuration(n, recipeType, recipeSubtype, thickness),
  }))

  // Compute span using the same algorithm as useRecipeCalculator
  const t0 = new Date(2000, 0, 1)
  let mx = t0
  const tmp: { id: string; s: Date; e: Date }[] = []

  for (const n of nodesWithDur) {
    let earliest = t0
    // Find all incoming edges
    const inEdges = graph.edges.filter((e) => e.target === n.id)
    for (const edge of inEdges) {
      const parent = tmp.find((r) => r.id === edge.source)
      if (parent) {
        const t = new Date(
          parent.s.getTime() +
          (parent.e.getTime() - parent.s.getTime()) * edge.data.scheduleTimeRatio,
        )
        if (t > earliest) earliest = t
      }
    }
    const st = new Date(earliest)
    const en = new Date(st.getTime() + n.dur * 60000)
    tmp.push({ id: n.id, s: st, e: en })
    if (en > mx) mx = en
  }

  const span = Math.round((mx.getTime() - t0.getTime()) / 60000)
  return { nodes: nodesWithDur, span }
}

// ── Time summary ────────────────────────────────────────────────

export function computeTimeSummary(
  nodesWithDur: (RecipeNode & { dur: number })[],
  span: number,
): TimeSummary {
  const c: Record<string, number> = {}
  for (const n of nodesWithDur) {
    c[n.type] = (c[n.type] || 0) + n.dur
  }
  return {
    total: span,
    prep: (c.pre_dough || 0) + (c.pre_ferment || 0) + (c.dough || 0) + (c.rest || 0) + (c.shape || 0) + (c.prep || 0),
    rise: c.rise || 0,
    bake: (c.bake || 0) + (c.post_bake || 0),
  }
}

// ── Scale node ingredients ──────────────────────────────────────

export function scaleNodeData(data: NodeData, factor: number): NodeData {
  return {
    ...data,
    flours: data.flours.map((x) => ({ ...x, g: rnd(x.g * factor) })),
    liquids: data.liquids.map((x) => ({ ...x, g: rnd(x.g * factor) })),
    extras: data.extras.map((x) => (x.unit ? x : { ...x, g: rnd(x.g * factor) })),
    yeasts: (data.yeasts ?? []).map((x) => ({ ...x, g: rnd(x.g * factor) })),
    salts: (data.salts ?? []).map((x) => ({ ...x, g: rnd(x.g * factor) })),
    sugars: (data.sugars ?? []).map((x) => ({ ...x, g: rnd(x.g * factor) })),
    fats: (data.fats ?? []).map((x) => ({ ...x, g: rnd(x.g * factor) })),
  }
}
