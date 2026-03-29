/**
 * PanoramicaManager — orchestrates multi-layer recipe overview.
 *
 * Computes a unified view across all layers and cross-layer edges,
 * then generates a time-ordered execution timeline.
 *
 * Pure graph algorithm — no science rules today, but takes ScienceProvider
 * for future extensibility.
 */

import type { ScienceProvider } from './science/science-provider'
import type { RecipeLayer, CrossLayerEdge } from '@commons/types/recipe-layers'

// ── Types ────────────────────────────────────────────────────

export interface LayerSummary {
  layerId: string
  layerType: string
  name: string
  nodeCount: number
  totalDuration: number
  criticalPath: string[]
}

export interface CrossDependency {
  edgeId: string
  sourceLayerId: string
  sourceNodeId: string
  targetLayerId: string
  targetNodeId: string
  label: string
}

export interface PanoramicaResult {
  layers: LayerSummary[]
  crossDependencies: CrossDependency[]
  totalDuration: number
  criticalLayerId: string
}

export interface TimelineStep {
  time: number
  layerId: string
  nodeId: string
  nodeTitle: string
  duration: number
  type: 'start' | 'wait' | 'action'
}

// ── Helpers ──────────────────────────────────────────────────

/**
 * Compute the critical path duration for a single layer via topological traversal.
 * Returns { totalDuration, criticalPath (node IDs) }.
 */
function computeLayerCriticalPath(layer: RecipeLayer): { totalDuration: number; criticalPath: string[] } {
  const nodeMap = new Map(layer.nodes.map((n) => [n.id, n]))
  const adjacency = new Map<string, string[]>()
  const inDegree = new Map<string, number>()

  for (const node of layer.nodes) {
    adjacency.set(node.id, [])
    inDegree.set(node.id, 0)
  }

  for (const edge of layer.edges) {
    adjacency.get(edge.source)?.push(edge.target)
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1)
  }

  // Topological sort with longest-path tracking
  const dist = new Map<string, number>()
  const prev = new Map<string, string | null>()
  const queue: string[] = []

  for (const node of layer.nodes) {
    const dur = Number((node.data as Record<string, unknown>).baseDur ?? 0)
    dist.set(node.id, dur)
    prev.set(node.id, null)
    if ((inDegree.get(node.id) ?? 0) === 0) queue.push(node.id)
  }

  while (queue.length > 0) {
    const current = queue.shift()!
    const currentDist = dist.get(current) ?? 0

    for (const neighbor of adjacency.get(current) ?? []) {
      const neighborDur = Number((nodeMap.get(neighbor)?.data as Record<string, unknown>)?.baseDur ?? 0)
      const newDist = currentDist + neighborDur

      if (newDist > (dist.get(neighbor) ?? 0)) {
        dist.set(neighbor, newDist)
        prev.set(neighbor, current)
      }

      const newInDeg = (inDegree.get(neighbor) ?? 1) - 1
      inDegree.set(neighbor, newInDeg)
      if (newInDeg === 0) queue.push(neighbor)
    }
  }

  // Find the node with longest distance (end of critical path)
  let maxDist = 0
  let endNode = ''
  for (const [nodeId, d] of dist) {
    if (d >= maxDist) {
      maxDist = d
      endNode = nodeId
    }
  }

  // Reconstruct critical path
  const criticalPath: string[] = []
  let cursor: string | null = endNode
  while (cursor) {
    criticalPath.unshift(cursor)
    cursor = prev.get(cursor) ?? null
  }

  return { totalDuration: maxDist, criticalPath }
}

// ── 1. computePanoramica ─────────────────────────────────────

/**
 * Compute a panoramic overview of the entire multi-layer recipe.
 *
 * For each layer, calculates the critical-path duration.
 * Cross-layer edges are collected as dependencies.
 * The total duration is the maximum across all layers
 * (layers run in parallel unless constrained by cross-edges).
 */
export function computePanoramica(
  _provider: ScienceProvider,
  layers: RecipeLayer[],
  crossEdges: CrossLayerEdge[],
): PanoramicaResult {
  const layerSummaries: LayerSummary[] = []

  for (const layer of layers) {
    const { totalDuration, criticalPath } = computeLayerCriticalPath(layer)

    layerSummaries.push({
      layerId: layer.id,
      layerType: layer.type,
      name: layer.name,
      nodeCount: layer.nodes.length,
      totalDuration,
      criticalPath,
    })
  }

  const crossDependencies: CrossDependency[] = crossEdges.map((e) => ({
    edgeId: e.id,
    sourceLayerId: e.sourceLayerId,
    sourceNodeId: e.sourceNodeId,
    targetLayerId: e.targetLayerId,
    targetNodeId: e.targetNodeId,
    label: e.label ?? '',
  }))

  // Total duration = max of all layer durations (parallel execution)
  let totalDuration = 0
  let criticalLayerId = ''
  for (const summary of layerSummaries) {
    if (summary.totalDuration > totalDuration) {
      totalDuration = summary.totalDuration
      criticalLayerId = summary.layerId
    }
  }

  return {
    layers: layerSummaries,
    crossDependencies,
    totalDuration,
    criticalLayerId,
  }
}

// ── 2. generateTimeline ──────────────────────────────────────

/**
 * Generate a time-ordered execution timeline from a panoramica result.
 *
 * Works backward from targetCompletionTime to assign start times.
 * The critical-path layer finishes exactly at target; other layers
 * are scheduled to finish at or before the target.
 *
 * @param panoramica — result from computePanoramica
 * @param targetCompletionTime — target completion time in minutes from now
 * @returns ordered list of timeline steps
 */
export function generateTimeline(
  panoramica: PanoramicaResult,
  targetCompletionTime: number,
): TimelineStep[] {
  const steps: TimelineStep[] = []

  for (const layer of panoramica.layers) {
    // Each layer starts so it finishes by targetCompletionTime
    const layerStart = targetCompletionTime - layer.totalDuration
    let currentTime = layerStart

    for (const nodeId of layer.criticalPath) {
      steps.push({
        time: currentTime,
        layerId: layer.layerId,
        nodeId,
        nodeTitle: nodeId, // Caller can resolve to actual title
        duration: 0, // Placeholder — caller resolves from node data
        type: 'action',
      })
      // Advance time (approximate — actual duration comes from node data)
      currentTime += layer.totalDuration / Math.max(layer.criticalPath.length, 1)
    }
  }

  // Sort by time ascending
  steps.sort((a, b) => a.time - b.time)

  return steps
}
