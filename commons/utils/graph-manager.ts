/**
 * GraphManager — Centralized pure graph operations.
 *
 * Owns:
 * - Topology queries (parents, children, ancestors, descendants)
 * - Topological sort (Kahn's algorithm)
 * - Node addition and removal (with edge re-routing)
 * - Graph validation (cycles, orphans, edge integrity)
 * - Node weight calculation
 *
 * All functions are PURE — they return new graph objects without mutation.
 */

import type {
  RecipeGraph,
  RecipeNode,
  RecipeEdge,
  NodeData,
  NodeTypeKey,
} from '@commons/types/recipe-graph'

// ── Re-exports from graph-utils (canonical source moves here) ──
// graph-utils.ts still exists for backward compat but these are the canonical exports.

// ── Weight ─────────────────────────────────────────────────────

/** Sum all ingredient weights in a node's data. */
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

// ── Topology queries ───────────────────────────────────────────

/** Get parent node IDs (sources of edges targeting this node). */
export function getParentIds(nodeId: string, edges: RecipeEdge[]): string[] {
  return edges.filter((e) => e.target === nodeId).map((e) => e.source)
}

/** Get child node IDs (targets of edges sourced from this node). */
export function getChildNodeIds(nodeId: string, edges: RecipeEdge[]): string[] {
  return edges.filter((e) => e.source === nodeId).map((e) => e.target)
}

/** Get all ancestor IDs (transitive parents) via BFS. */
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

/** Get all descendant IDs (transitive children) via BFS. */
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

// ── Topological sort ───────────────────────────────────────────

/** Topological sort of nodes using Kahn's algorithm. */
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

// ── Validation ─────────────────────────────────────────────────

export interface GraphValidationResult {
  valid: boolean
  errors: string[]
}

/** Validate the recipe graph structure. */
export function validateGraph(graph: RecipeGraph): GraphValidationResult {
  const errors: string[] = []
  const nodeIds = new Set(graph.nodes.map((n) => n.id))

  for (const e of graph.edges) {
    if (!nodeIds.has(e.source)) errors.push(`Edge "${e.id}" references unknown source "${e.source}"`)
    if (!nodeIds.has(e.target)) errors.push(`Edge "${e.id}" references unknown target "${e.target}"`)
  }

  for (const e of graph.edges) {
    if (e.data.scheduleTimeRatio < 0 || e.data.scheduleTimeRatio > 1)
      errors.push(`Edge "${e.id}" has invalid scheduleTimeRatio ${e.data.scheduleTimeRatio}`)
    if (e.data.scheduleQtyRatio <= 0 || e.data.scheduleQtyRatio > 1)
      errors.push(`Edge "${e.id}" has invalid scheduleQtyRatio ${e.data.scheduleQtyRatio}`)
  }

  for (const n of graph.nodes) {
    if (n.type === 'split' && n.data.splitMode === 'pct' && n.data.splitOutputs) {
      const sum = n.data.splitOutputs.reduce((a, o) => a + o.value, 0)
      if (Math.abs(sum - 100) > 0.01)
        errors.push(`Split node "${n.id}" outputs sum to ${sum}%, expected 100%`)
    }
  }

  const nodesWithIncoming = new Set(graph.edges.map((e) => e.target))
  for (const n of graph.nodes) {
    const hasIncoming = nodesWithIncoming.has(n.id)
    const hasOutgoing = graph.edges.some((e) => e.source === n.id)
    if (!hasIncoming && !hasOutgoing && graph.nodes.length > 1 && n.type !== 'done')
      errors.push(`Node "${n.id}" is orphaned (no edges)`)
  }

  const sorted = topologicalSortGraph(graph)
  if (sorted.length < graph.nodes.length) errors.push('Graph contains a cycle')

  return { valid: errors.length === 0, errors }
}

// ── Node addition ──────────────────────────────────────────────

/**
 * Add a node after an existing node in the graph.
 * Re-routes existing outgoing edges from afterNode through the new node.
 * Returns new graph + the new node ID.
 *
 * Pure function — does not mutate input.
 */
export function addNodeToGraph(
  graph: RecipeGraph,
  afterNodeId: string,
  type: NodeTypeKey,
  subtype: string | null = null,
): { graph: RecipeGraph; newNodeId: string } {
  const newId = `${type}_${Date.now().toString(36)}`
  const afterNode = graph.nodes.find((n) => n.id === afterNodeId)

  const defaultData: NodeData = {
    title: '',
    desc: '',
    group: afterNode?.data.group ?? 'Impasto',
    baseDur: type === 'split' ? 5 : 10,
    restDur: 0,
    restTemp: null,
    flours: [],
    liquids: [],
    extras: [],
    yeasts: [],
    salts: [],
    sugars: [],
    fats: [],
  }

  if (type === 'split') {
    defaultData.splitMode = 'pct'
    defaultData.splitOutputs = [
      { handle: 'out_0', label: 'Parte 1', value: 50 },
      { handle: 'out_1', label: 'Parte 2', value: 50 },
    ]
  }
  if (type === 'join') {
    defaultData.joinMethod = 'generic'
  }

  const newNode: RecipeNode = {
    id: newId,
    type,
    subtype: subtype ?? null,
    position: {
      x: (afterNode?.position.x ?? 0),
      y: (afterNode?.position.y ?? 0) + 120,
    },
    lane: afterNode?.lane ?? 'main',
    data: defaultData,
  }

  const newEdge: RecipeEdge = {
    id: `e_${afterNodeId}__${newId}`,
    source: afterNodeId,
    target: newId,
    data: { scheduleTimeRatio: 1, scheduleQtyRatio: 1 },
  }

  // Re-route edges from afterNode through newNode
  const outEdges = graph.edges.filter((e) => e.source === afterNodeId)
  const keptEdges = graph.edges.filter((e) => e.source !== afterNodeId)
  const reroutedEdges = outEdges.map((e) => ({
    ...e,
    id: `e_${newId}__${e.target}`,
    source: newId,
  }))

  return {
    graph: {
      ...graph,
      nodes: [...graph.nodes, newNode],
      edges: [...keptEdges, newEdge, ...reroutedEdges],
    },
    newNodeId: newId,
  }
}

// ── Node data update ───────────────────────────────────────────

/** Update a node's data by merging a patch. Pure function. */
export function updateNodeData(graph: RecipeGraph, nodeId: string, patch: Partial<NodeData>): RecipeGraph {
  return {
    ...graph,
    nodes: graph.nodes.map((n) =>
      n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n,
    ),
  }
}
