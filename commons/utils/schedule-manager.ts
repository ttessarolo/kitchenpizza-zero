/**
 * ScheduleManager — Centralized timeline and scheduling logic.
 *
 * Owns:
 * - Lane derivation from graph topology
 * - Schedule computation (start/end times per node)
 * - Total duration and time summary
 */

import type { RecipeGraph, RecipeNode, LaneDefinition } from '@commons/types/recipe-graph'
import { topologicalSortGraph } from './graph-manager'

// Re-export lane derivation (originally in lane-derivation.ts)
export { deriveLanes } from './lane-derivation'

// ── Schedule computation ───────────────────────────────────────

export interface NodeWithDuration extends RecipeNode {
  dur: number
}

export interface Schedule {
  nodes: NodeWithDuration[]
  span: number
}

export interface TimeSummary {
  total: number
  prep: number
  rise: number
  bake: number
}

/**
 * Get effective duration for a node in minutes (baseDur + restDur).
 */
export function getNodeDuration(node: RecipeNode): number {
  return (node.data.baseDur || 0) + (node.data.restDur || 0)
}

/**
 * Compute the schedule (start/end times) for all nodes in the graph.
 * Uses topological sort + edge time ratios to determine earliest start times.
 * Returns nodes with durations and total span in minutes.
 */
export function computeSchedule(graph: RecipeGraph): Schedule {
  const sorted = topologicalSortGraph(graph)
  const nodesWithDur = sorted.map((n) => ({
    ...n,
    dur: getNodeDuration(n),
  }))

  const t0 = new Date(2000, 0, 1)
  let mx = t0
  const tmp: { id: string; s: Date; e: Date }[] = []

  for (const n of nodesWithDur) {
    let earliest = t0
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

/**
 * Compute time summary: total, prep, rise, bake durations.
 */
export function computeTimeSummary(nodesWithDur: NodeWithDuration[], span: number): TimeSummary {
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

/**
 * Total recipe duration in minutes (span from first to last node).
 */
export function totalDuration(graph: RecipeGraph): number {
  return computeSchedule(graph).span
}
