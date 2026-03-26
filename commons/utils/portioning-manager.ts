/**
 * PortioningManager — Centralized portioning, weight, and scaling logic.
 *
 * Owns:
 * - Target weight calculation (tray mode vs ball mode)
 * - Graph totals computation (flour, liquid, dough, hydration)
 * - Node weight calculation
 * - Ingredient scaling (uniform, hydration-only)
 * - Portioning-driven scaling (target → factor → scale all nodes)
 *
 * Key constraint: portioning is the USER's source of truth.
 * The reconciler never overwrites portioning — only explicit user actions change it.
 */

import type { RecipeGraph, RecipeNode, NodeData } from '@commons/types/recipe-graph'
import type { Portioning } from '@commons/types/recipe'
import { rnd } from './format'

// Node types that contribute to dough totals
const DOUGH_NODE_TYPES = new Set(['dough', 'pre_ferment'])

// ── Target weight ──────────────────────────────────────────────

/**
 * Calculate the target dough weight from portioning settings.
 * - Tray mode: length × width × thickness × count (cm³ ≈ grams)
 * - Ball mode: weight per ball × count
 */
export function calcTargetWeight(portioning: Portioning): number {
  return portioning.mode === 'tray'
    ? Math.round(portioning.tray.l * portioning.tray.w * portioning.thickness * portioning.tray.count)
    : portioning.ball.weight * portioning.ball.count
}

// ── Graph totals ───────────────────────────────────────────────

export interface GraphTotals {
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

/** Sum all ingredient weights in a single node's data. */
export function getNodeTotalWeight(data: NodeData): number {
  return (
    data.flours.reduce((a, f) => a + f.g, 0) +
    data.liquids.reduce((a, l) => a + l.g, 0) +
    data.extras.reduce((a, e) => a + (e.unit ? 0 : e.g), 0) +
    (data.yeasts ?? []).reduce((a, y) => a + y.g, 0) +
    (data.salts ?? []).reduce((a, s) => a + s.g, 0) +
    (data.sugars ?? []).reduce((a, s) => a + s.g, 0) +
    (data.fats ?? []).reduce((a, f) => a + f.g, 0)
  )
}

/**
 * Compute all ingredient totals from the graph.
 * Only counts nodes in DOUGH_NODE_TYPES (dough, pre_ferment).
 */
export function computeGraphTotals(graph: RecipeGraph): GraphTotals {
  let totalFlour = 0
  let totalLiquid = 0
  let totalExtras = 0
  let totalYeast = 0
  let totalSalt = 0
  let totalSugar = 0
  let totalFat = 0

  for (const n of graph.nodes) {
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

// ── Scaling ────────────────────────────────────────────────────

/**
 * Scale a single node's ingredient weights by a factor.
 * Preserves extras with `unit` property (e.g., "1 tsp").
 */
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

/**
 * Scale all nodes uniformly to match a new total dough weight.
 * Returns new nodes array (does not mutate).
 */
export function scaleAllNodes(nodes: RecipeNode[], newTotal: number, currentTotal: number): RecipeNode[] {
  if (currentTotal <= 0) return nodes
  const factor = newTotal / currentTotal
  return nodes.map((n) => ({ ...n, data: scaleNodeData(n.data, factor) }))
}

/**
 * Scale only liquid ingredients to reach a target hydration.
 * Returns new nodes array (does not mutate).
 */
export function scaleToHydration(nodes: RecipeNode[], targetHydration: number): RecipeNode[] {
  let totalFlour = 0
  let totalLiquid = 0
  for (const n of nodes) {
    if (!DOUGH_NODE_TYPES.has(n.type)) continue
    totalFlour += n.data.flours.reduce((a, f) => a + f.g, 0)
    totalLiquid += n.data.liquids.reduce((a, l) => a + l.g, 0)
  }
  if (totalFlour <= 0 || totalLiquid <= 0) return nodes

  const targetLiquid = (totalFlour * targetHydration) / 100
  const factor = targetLiquid / totalLiquid

  return nodes.map((n) => ({
    ...n,
    data: {
      ...n.data,
      liquids: n.data.liquids.map((l) => ({ ...l, g: rnd(l.g * factor) })),
    },
  }))
}

/**
 * Apply new portioning settings: calculate target, scale graph, return result.
 * This is the canonical operation for portioning changes.
 */
export function applyPortioning(
  graph: RecipeGraph,
  newPortioning: Portioning,
): { graph: RecipeGraph; factor: number } {
  const newTarget = calcTargetWeight(newPortioning)
  const totals = computeGraphTotals(graph)
  if (totals.totalDough <= 0) return { graph, factor: 1 }

  const factor = newTarget / totals.totalDough
  const newNodes = scaleAllNodes(graph.nodes, newTarget, totals.totalDough)
  return { graph: { ...graph, nodes: newNodes }, factor }
}
