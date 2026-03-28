/**
 * Graph utility functions for RecipeGraph (v2).
 *
 * These operate on nodes[] + edges[] instead of steps[] + deps[].
 */

import type {
  RecipeGraph,
  RecipeNode,
  RecipeEdge,
  NodeData,
} from '@commons/types/recipe-graph'

// ── Weight calculation ──────────────────────────────────────────

/** Sum all ingredient weights in a node's data */
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

// ── Topology ────────────────────────────────────────────────────

/** Get parent node IDs (sources of edges targeting this node) */
export function getParentIds(nodeId: string, edges: RecipeEdge[]): string[] {
  return edges.filter((e) => e.target === nodeId).map((e) => e.source)
}

/** Get child node IDs (targets of edges sourced from this node) */
export function getChildNodeIds(nodeId: string, edges: RecipeEdge[]): string[] {
  return edges.filter((e) => e.source === nodeId).map((e) => e.target)
}

/** Get all ancestor IDs (transitive parents) via BFS */
export function getAncestorNodeIds(nodeId: string, edges: RecipeEdge[]): Set<string> {
  const ancestors = new Set<string>()
  const queue = getParentIds(nodeId, edges)
  while (queue.length) {
    const id = queue.shift()!
    if (ancestors.has(id)) continue
    ancestors.add(id)
    queue.push(...getParentIds(id, edges))
  }
  return ancestors
}

/** Get all descendant IDs (transitive children) via BFS */
export function getDescendantNodeIds(nodeId: string, edges: RecipeEdge[]): Set<string> {
  const descendants = new Set<string>()
  const queue = getChildNodeIds(nodeId, edges)
  while (queue.length) {
    const id = queue.shift()!
    if (descendants.has(id)) continue
    descendants.add(id)
    queue.push(...getChildNodeIds(id, edges))
  }
  return descendants
}

/** Topological sort of nodes using Kahn's algorithm */
export function topologicalSortGraph(graph: RecipeGraph): RecipeNode[] {
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]))
  const inDegree = new Map<string, number>()
  const adj = new Map<string, string[]>()

  for (const n of graph.nodes) {
    inDegree.set(n.id, 0)
    adj.set(n.id, [])
  }
  for (const e of graph.edges) {
    if (adj.has(e.source)) {
      adj.get(e.source)!.push(e.target)
      inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1)
    }
  }

  const queue: string[] = []
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id)
  }

  const sorted: RecipeNode[] = []
  while (queue.length) {
    const id = queue.shift()!
    const node = nodeMap.get(id)
    if (node) sorted.push(node)
    for (const child of adj.get(id) || []) {
      const nd = (inDegree.get(child) || 1) - 1
      inDegree.set(child, nd)
      if (nd === 0) queue.push(child)
    }
  }

  return sorted
}

// ── Validation ──────────────────────────────────────────────────

export interface GraphValidationResult {
  valid: boolean
  errors: string[]
}

/** Validate the recipe graph */
export function validateGraph(graph: RecipeGraph): GraphValidationResult {
  const errors: string[] = []
  const nodeIds = new Set(graph.nodes.map((n) => n.id))

  // Check edges reference existing nodes
  for (const e of graph.edges) {
    if (!nodeIds.has(e.source)) {
      errors.push(`Edge "${e.id}" references unknown source "${e.source}"`)
    }
    if (!nodeIds.has(e.target)) {
      errors.push(`Edge "${e.id}" references unknown target "${e.target}"`)
    }
  }

  // Check waitRatio and portion ranges
  for (const e of graph.edges) {
    if (e.data.scheduleTimeRatio < 0 || e.data.scheduleTimeRatio > 1) {
      errors.push(`Edge "${e.id}" has invalid scheduleTimeRatio ${e.data.scheduleTimeRatio}`)
    }
    if (e.data.scheduleQtyRatio <= 0 || e.data.scheduleQtyRatio > 1) {
      errors.push(`Edge "${e.id}" has invalid scheduleQtyRatio ${e.data.scheduleQtyRatio}`)
    }
  }

  // Check split outputs sum to 100% (when mode is pct)
  for (const n of graph.nodes) {
    if (n.type === 'split' && n.data.splitMode === 'pct' && n.data.splitOutputs) {
      const sum = n.data.splitOutputs.reduce((a, o) => a + o.value, 0)
      if (Math.abs(sum - 100) > 0.01) {
        errors.push(`Split node "${n.id}" outputs sum to ${sum}%, expected 100%`)
      }
    }
  }

  // Check no orphan nodes (every node except roots has at least 1 incoming edge)
  const nodesWithIncoming = new Set(graph.edges.map((e) => e.target))
  for (const n of graph.nodes) {
    const hasIncoming = nodesWithIncoming.has(n.id)
    const hasOutgoing = graph.edges.some((e) => e.source === n.id)
    if (!hasIncoming && graph.nodes.length > 1 && n.type !== 'done') {
      // Root nodes: no incoming is fine
      // But if a node has no incoming AND no outgoing, it's orphaned
      if (!hasOutgoing && graph.nodes.length > 1) {
        errors.push(`Node "${n.id}" is orphaned (no edges)`)
      }
    }
  }

  // Cycle detection via topological sort
  const sorted = topologicalSortGraph(graph)
  if (sorted.length < graph.nodes.length) {
    errors.push('Graph contains a cycle')
  }

  return { valid: errors.length === 0, errors }
}

// ── Node removal ────────────────────────────────────────────────

/** Merge source ingredients into target, scaled by factor */
function mergeIngArray<T extends { type: string; g: number }>(
  target: T[],
  source: T[],
  factor: number,
): T[] {
  const result = target.map((t) => ({ ...t }))
  for (const s of source) {
    const scaled = Math.round(s.g * factor)
    if (scaled <= 0) continue
    const existing = result.find((r) => r.type === s.type)
    if (existing) {
      existing.g += scaled
    } else {
      result.push({ ...s, g: scaled })
    }
  }
  return result
}

function mergeNamedIngArray<T extends { name: string; g: number }>(
  target: T[],
  source: T[],
  factor: number,
): T[] {
  const result = target.map((t) => ({ ...t }))
  for (const s of source) {
    const scaled = Math.round(s.g * factor)
    if (scaled <= 0) continue
    const existing = result.find((r) => r.name === s.name)
    if (existing) {
      existing.g += scaled
    } else {
      result.push({ ...s, g: scaled })
    }
  }
  return result
}

/**
 * Remove a node from the graph, transferring its ingredients to child nodes
 * and reconnecting edges through the removed node.
 */
export function removeNodeFromGraph(nodeId: string, graph: RecipeGraph): RecipeGraph {
  const removed = graph.nodes.find((n) => n.id === nodeId)
  if (!removed) return graph

  // Edges into and out of the removed node
  const inEdges = graph.edges.filter((e) => e.target === nodeId)
  const outEdges = graph.edges.filter((e) => e.source === nodeId)
  const childIds = new Set(outEdges.map((e) => e.target))

  // Remove the node
  const newNodes = graph.nodes
    .filter((n) => n.id !== nodeId)
    .map((n) => {
      if (!childIds.has(n.id)) return n

      // This node was a child of the removed node
      const edgeFromRemoved = outEdges.find((e) => e.target === n.id)
      const gramsFactor = edgeFromRemoved?.data.scheduleQtyRatio ?? 1

      // Merge removed node's ingredients into this child
      const d = n.data
      const rd = removed.data
      return {
        ...n,
        data: {
          ...d,
          flours: mergeIngArray(d.flours, rd.flours, gramsFactor),
          liquids: mergeIngArray(d.liquids, rd.liquids, gramsFactor),
          extras: mergeNamedIngArray(d.extras, rd.extras, gramsFactor),
          yeasts: mergeIngArray(d.yeasts ?? [], rd.yeasts ?? [], gramsFactor),
          salts: mergeIngArray(d.salts ?? [], rd.salts ?? [], gramsFactor),
          sugars: mergeIngArray(d.sugars ?? [], rd.sugars ?? [], gramsFactor),
          fats: mergeIngArray(d.fats ?? [], rd.fats ?? [], gramsFactor),
          sourcePrep: d.sourcePrep === nodeId
            ? (inEdges.length === 1 ? inEdges[0].source : null)
            : d.sourcePrep,
        },
      }
    })

  // Reconnect edges: for each child, replace the removed edge with edges from removed's parents
  const removedEdgeIds = new Set([...inEdges, ...outEdges].map((e) => e.id))
  const keptEdges = graph.edges.filter((e) => !removedEdgeIds.has(e.id))

  const newEdges: RecipeEdge[] = []
  for (const outE of outEdges) {
    const childGrams = outE.data.scheduleQtyRatio
    for (const inE of inEdges) {
      newEdges.push({
        id: `e_${inE.source}__${outE.target}`,
        source: inE.source,
        target: outE.target,
        data: {
          scheduleTimeRatio: inE.data.scheduleTimeRatio,
          scheduleQtyRatio: (inE.data.scheduleQtyRatio ?? 1) * childGrams,
        },
      })
    }
  }

  return {
    ...graph,
    nodes: newNodes,
    edges: [...keptEdges, ...newEdges],
  }
}
