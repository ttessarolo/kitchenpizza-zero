/**
 * Automatic lane derivation from graph topology.
 */

import type { RecipeGraph, LaneDefinition } from '@commons/types/recipe-graph'

/**
 * Derive lanes from the graph topology:
 * 1. "main" lane includes all nodes reachable from root that don't pass through split handles
 * 2. Split outputs create new lanes
 * 3. Prep nodes without predecessors in main get their own lane
 * 4. After a join, nodes return to the pre-split lane
 */
export function deriveLanes(graph: RecipeGraph): LaneDefinition[] {
  const lanes: LaneDefinition[] = []
  const nodeLaneMap = new Map<string, string>()

  // Find root nodes (no incoming edges)
  const hasIncoming = new Set(graph.edges.map((e) => e.target))
  const roots = graph.nodes.filter((n) => !hasIncoming.has(n.id))

  // BFS from roots to assign lanes
  const queue: { nodeId: string; lane: string }[] = []
  for (const root of roots) {
    // Prep roots get their own lane
    if (root.type === 'prep') {
      const laneId = `prep_${root.id}`
      queue.push({ nodeId: root.id, lane: laneId })
    } else {
      queue.push({ nodeId: root.id, lane: 'main' })
    }
  }

  // Always have a main lane
  lanes.push({ id: 'main', label: 'Panificazione', isMain: true, origin: { type: 'user' } })

  const visited = new Set<string>()
  while (queue.length) {
    const { nodeId, lane } = queue.shift()!
    if (visited.has(nodeId)) continue
    visited.add(nodeId)
    nodeLaneMap.set(nodeId, lane)

    const node = graph.nodes.find((n) => n.id === nodeId)
    if (!node) continue

    // Get outgoing edges
    const outEdges = graph.edges.filter((e) => e.source === nodeId)

    if (node.type === 'split' && node.data.splitOutputs) {
      // Each split output creates a new lane
      for (const out of node.data.splitOutputs) {
        const targetEdge = outEdges.find((e) => e.sourceHandle === out.handle)
        if (targetEdge) {
          const splitLaneId = `split_${nodeId}_${out.handle}`
          if (!lanes.find((l) => l.id === splitLaneId)) {
            lanes.push({
              id: splitLaneId,
              label: out.label || `Parte ${out.handle}`,
              isMain: false,
              origin: { type: 'split', splitNodeId: nodeId },
            })
          }
          queue.push({ nodeId: targetEdge.target, lane: splitLaneId })
        }
      }
    } else if (node.type === 'join') {
      // After join, return to main
      for (const e of outEdges) {
        queue.push({ nodeId: e.target, lane: 'main' })
      }
    } else {
      // Normal: propagate same lane
      for (const e of outEdges) {
        queue.push({ nodeId: e.target, lane })
      }
    }
  }

  // Add prep lanes
  const prepLaneIds = new Set<string>()
  for (const [nodeId, lane] of nodeLaneMap) {
    if (lane.startsWith('prep_') && !prepLaneIds.has(lane)) {
      prepLaneIds.add(lane)
      const node = graph.nodes.find((n) => n.id === nodeId)
      if (!lanes.find((l) => l.id === lane)) {
        lanes.push({
          id: lane,
          label: `Preparazione ${node?.data.title || nodeId}`,
          isMain: false,
          origin: { type: 'prep' },
        })
      }
    }
  }

  // Update node lanes
  // (This function returns lanes — the caller should update node.lane if needed)
  return lanes
}
