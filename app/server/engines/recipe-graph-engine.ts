/**
 * RecipeGraphEngine — Graphology wrapper for recipe graphs.
 *
 * Provides lossless roundtrip conversion between the flat RecipeGraph
 * arrays (nodes[], edges[], lanes[]) and a Graphology directed graph,
 * plus topology queries, traversal helpers, and multi-layer operations.
 */

import Graph from 'graphology'
import { topologicalSort as gTopologicalSort, hasCycle } from 'graphology-dag'
import type {
  RecipeGraph,
  RecipeNode,
  RecipeEdge,
  RecipeEdgeData,
  NodeData,
  NodeTypeKey,
  LaneDefinition,
} from '@commons/types/recipe-graph'

// ── Internal Types ──────────────────────────────────────────────────

export interface GraphNodeAttrs {
  type: NodeTypeKey
  subtype: string | null
  lane: string
  layerId: string
  position: { x: number; y: number }
  data: NodeData
}

export interface GraphEdgeAttrs {
  sourceHandle?: string | null
  targetHandle?: string | null
  data: RecipeEdgeData
  crossLayer?: boolean
}

export interface CrossEdgeStub {
  localNodeId: string
  externalLayerId: string
  externalNodeId: string
  direction: 'in' | 'out'
  edgeData: RecipeEdgeData
}

export interface PathOpts {
  notThrough?: Set<string>
  maxHops?: number
}

// ── Engine ──────────────────────────────────────────────────────────

export class RecipeGraphEngine {
  private g: Graph<GraphNodeAttrs, GraphEdgeAttrs>
  private lanes: LaneDefinition[]

  constructor() {
    this.g = new Graph<GraphNodeAttrs, GraphEdgeAttrs>({
      type: 'directed',
      multi: false,
      allowSelfLoops: false,
    })
    this.lanes = []
  }

  // ─── Serialization ──────────────────────────────────────────────

  /**
   * Clear the graph and load all nodes/edges from a RecipeGraph.
   * Every node receives `layerId` as an attribute for multi-layer filtering.
   */
  loadFromRecipeGraph(rg: RecipeGraph, layerId = 'default'): void {
    this.g.clear()
    this.lanes = [...rg.lanes]

    for (const node of rg.nodes) {
      this.g.addNode(node.id, {
        type: node.type,
        subtype: node.subtype,
        lane: node.lane,
        layerId,
        position: { ...node.position },
        data: node.data,
      })
    }

    for (const edge of rg.edges) {
      this.g.addEdgeWithKey(edge.id, edge.source, edge.target, {
        sourceHandle: edge.sourceHandle ?? null,
        targetHandle: edge.targetHandle ?? null,
        data: edge.data,
      })
    }
  }

  /**
   * Reconstruct a RecipeGraph from the current Graphology state.
   * If `layerId` is provided, only include nodes belonging to that layer
   * and edges whose both endpoints belong to the layer.
   */
  toRecipeGraph(layerId?: string): RecipeGraph {
    const nodes: RecipeNode[] = []
    const edges: RecipeEdge[] = []

    const includedNodeIds = new Set<string>()

    this.g.forEachNode((id, attrs) => {
      if (layerId != null && attrs.layerId !== layerId) return
      includedNodeIds.add(id)
      nodes.push({
        id,
        type: attrs.type,
        subtype: attrs.subtype,
        position: { ...attrs.position },
        lane: attrs.lane,
        data: attrs.data,
      })
    })

    this.g.forEachEdge((edgeId, attrs, source, target) => {
      if (!includedNodeIds.has(source) || !includedNodeIds.has(target)) return
      edges.push({
        id: edgeId,
        source,
        target,
        sourceHandle: attrs.sourceHandle,
        targetHandle: attrs.targetHandle,
        data: attrs.data,
      })
    })

    return { nodes, edges, lanes: [...this.lanes] }
  }

  // ─── Topology ───────────────────────────────────────────────────

  /**
   * Topological sort of node IDs.
   * If `layerId` is given, builds a subgraph of that layer first.
   */
  topologicalSort(layerId?: string): string[] {
    if (layerId == null) {
      return gTopologicalSort(this.g)
    }

    // Build a temporary subgraph for the layer
    const sub = new Graph<GraphNodeAttrs, GraphEdgeAttrs>({
      type: 'directed',
      multi: false,
      allowSelfLoops: false,
    })

    const layerNodes = new Set<string>()
    this.g.forEachNode((id, attrs) => {
      if (attrs.layerId === layerId) {
        layerNodes.add(id)
        sub.addNode(id, attrs)
      }
    })

    this.g.forEachEdge((edgeId, attrs, source, target) => {
      if (layerNodes.has(source) && layerNodes.has(target)) {
        sub.addEdgeWithKey(edgeId, source, target, attrs)
      }
    })

    return gTopologicalSort(sub)
  }

  /**
   * Returns true if the graph contains at least one cycle.
   */
  hasCycles(): boolean {
    return hasCycle(this.g)
  }

  /**
   * Compute the critical (longest) path by cumulative baseDur.
   * Uses topological sort + dynamic programming.
   * If `layerId` is given, restricts to that layer's nodes.
   */
  criticalPath(layerId?: string): string[] {
    const sorted = this.topologicalSort(layerId)
    if (sorted.length === 0) return []

    const layerNodes = layerId != null
      ? new Set<string>(sorted)
      : null

    const longestTo = new Map<string, number>()
    const predecessor = new Map<string, string | null>()

    for (const nodeId of sorted) {
      longestTo.set(nodeId, 0)
      predecessor.set(nodeId, null)
    }

    for (const nodeId of sorted) {
      const currentDist = longestTo.get(nodeId)!
      const baseDur = this.g.getNodeAttribute(nodeId, 'data').baseDur ?? 0

      for (const child of this.g.outNeighbors(nodeId)) {
        if (layerNodes != null && !layerNodes.has(child)) continue
        const candidate = currentDist + baseDur
        if (candidate > longestTo.get(child)!) {
          longestTo.set(child, candidate)
          predecessor.set(child, nodeId)
        }
      }
    }

    // Find the node with the maximum longestTo value
    let maxNode = sorted[0]
    let maxVal = -1
    for (const nodeId of sorted) {
      const val = longestTo.get(nodeId)!
      // Include the node's own baseDur in the final comparison
      const total = val + (this.g.getNodeAttribute(nodeId, 'data').baseDur ?? 0)
      if (total > maxVal) {
        maxVal = total
        maxNode = nodeId
      }
    }

    // Trace back to build the path
    const path: string[] = []
    let current: string | null = maxNode
    while (current != null) {
      path.push(current)
      current = predecessor.get(current) ?? null
    }
    path.reverse()

    return path
  }

  // ─── Traversal ──────────────────────────────────────────────────

  /**
   * All ancestor node IDs (transitive in-neighbors), not including `nodeId` itself.
   */
  ancestors(nodeId: string): Set<string> {
    const visited = new Set<string>()
    const queue: string[] = [...this.g.inNeighbors(nodeId)]

    while (queue.length > 0) {
      const current = queue.shift()!
      if (visited.has(current)) continue
      visited.add(current)
      for (const parent of this.g.inNeighbors(current)) {
        if (!visited.has(parent)) queue.push(parent)
      }
    }

    return visited
  }

  /**
   * All descendant node IDs (transitive out-neighbors), not including `nodeId` itself.
   */
  descendants(nodeId: string): Set<string> {
    const visited = new Set<string>()
    const queue: string[] = [...this.g.outNeighbors(nodeId)]

    while (queue.length > 0) {
      const current = queue.shift()!
      if (visited.has(current)) continue
      visited.add(current)
      for (const child of this.g.outNeighbors(current)) {
        if (!visited.has(child)) queue.push(child)
      }
    }

    return visited
  }

  /**
   * Direct parent node IDs (in-neighbors).
   */
  parents(nodeId: string): string[] {
    return this.g.inNeighbors(nodeId)
  }

  /**
   * Direct child node IDs (out-neighbors).
   */
  children(nodeId: string): string[] {
    return this.g.outNeighbors(nodeId)
  }

  /**
   * BFS backwards from `nodeId`, return the first node whose type matches.
   */
  findUpstream(nodeId: string, type: NodeTypeKey): string | null {
    const visited = new Set<string>()
    const queue: string[] = [...this.g.inNeighbors(nodeId)]

    while (queue.length > 0) {
      const current = queue.shift()!
      if (visited.has(current)) continue
      visited.add(current)

      if (this.g.getNodeAttribute(current, 'type') === type) {
        return current
      }

      for (const parent of this.g.inNeighbors(current)) {
        if (!visited.has(parent)) queue.push(parent)
      }
    }

    return null
  }

  /**
   * BFS forwards from `nodeId`, return the first node whose type matches.
   */
  findDownstream(nodeId: string, type: NodeTypeKey): string | null {
    const visited = new Set<string>()
    const queue: string[] = [...this.g.outNeighbors(nodeId)]

    while (queue.length > 0) {
      const current = queue.shift()!
      if (visited.has(current)) continue
      visited.add(current)

      if (this.g.getNodeAttribute(current, 'type') === type) {
        return current
      }

      for (const child of this.g.outNeighbors(current)) {
        if (!visited.has(child)) queue.push(child)
      }
    }

    return null
  }

  /**
   * Find all paths from `from` to `to` using DFS.
   * Optionally skip nodes in `notThrough` and limit path length by `maxHops`.
   */
  pathsBetween(from: string, to: string, opts?: PathOpts): string[][] {
    const notThrough = opts?.notThrough ?? new Set<string>()
    const maxHops = opts?.maxHops ?? Infinity
    const results: string[][] = []
    const visited = new Set<string>()

    const dfs = (current: string, path: string[]) => {
      if (current === to) {
        results.push([...path])
        return
      }

      // maxHops limits the number of edges, so path length (nodes) must be <= maxHops + 1
      if (path.length > maxHops) return

      for (const child of this.g.outNeighbors(current)) {
        if (visited.has(child)) continue
        if (notThrough.has(child) && child !== to) continue

        visited.add(child)
        path.push(child)
        dfs(child, path)
        path.pop()
        visited.delete(child)
      }
    }

    visited.add(from)
    dfs(from, [from])

    return results
  }

  // ─── Data Access ────────────────────────────────────────────────

  /**
   * Reconstruct a RecipeNode from Graphology attributes.
   */
  getNode(nodeId: string): RecipeNode {
    const attrs = this.g.getNodeAttributes(nodeId)
    return {
      id: nodeId,
      type: attrs.type,
      subtype: attrs.subtype,
      position: { ...attrs.position },
      lane: attrs.lane,
      data: attrs.data,
    }
  }

  /**
   * Return the NodeData for a given node.
   */
  getNodeData(nodeId: string): NodeData {
    return this.g.getNodeAttribute(nodeId, 'data')
  }

  /**
   * Merge a partial patch into a node's data.
   */
  updateNodeData(nodeId: string, patch: Partial<NodeData>): void {
    const existing = this.g.getNodeAttribute(nodeId, 'data')
    this.g.mergeNodeAttributes(nodeId, {
      data: { ...existing, ...patch },
    })
  }

  /**
   * Reconstruct a RecipeEdge from Graphology attributes + endpoints.
   */
  getEdge(edgeId: string): RecipeEdge {
    const attrs = this.g.getEdgeAttributes(edgeId)
    const source = this.g.source(edgeId)
    const target = this.g.target(edgeId)
    return {
      id: edgeId,
      source,
      target,
      sourceHandle: attrs.sourceHandle,
      targetHandle: attrs.targetHandle,
      data: attrs.data,
    }
  }

  /**
   * Iterate over all nodes with a callback.
   */
  forEachNode(fn: (id: string, attrs: GraphNodeAttrs) => void): void {
    this.g.forEachNode(fn)
  }

  /**
   * Find node IDs matching a compound filter.
   * - `type`: single NodeTypeKey or array of types
   * - `layerId`: restrict to a specific layer
   * - `where`: conditions on `data[field]` with operators:
   *   eq, neq, gt, lt, gte, lte, in, exists
   */
  findNodes(matcher: {
    type?: NodeTypeKey | NodeTypeKey[]
    layerId?: string
    where?: Record<string, { op: string; value?: unknown }>
  }): string[] {
    const results: string[] = []

    const typeSet = matcher.type != null
      ? new Set(Array.isArray(matcher.type) ? matcher.type : [matcher.type])
      : null

    this.g.forEachNode((id, attrs) => {
      // Filter by layerId
      if (matcher.layerId != null && attrs.layerId !== matcher.layerId) return

      // Filter by type
      if (typeSet != null && !typeSet.has(attrs.type)) return

      // Filter by where conditions
      if (matcher.where != null) {
        for (const [field, condition] of Object.entries(matcher.where)) {
          const fieldValue = (attrs.data as Record<string, unknown>)[field]
          if (!matchesCondition(fieldValue, condition.op, condition.value)) return
        }
      }

      results.push(id)
    })

    return results
  }

  // ─── Layer Operations ───────────────────────────────────────────

  /**
   * Extract a single layer into a new RecipeGraphEngine.
   * Cross-layer edges (where one endpoint is outside the layer) are returned
   * as CrossEdgeStubs for reconnection after merging.
   */
  extractLayer(layerId: string): { engine: RecipeGraphEngine; crossEdgeStubs: CrossEdgeStub[] } {
    const engine = new RecipeGraphEngine()
    const crossEdgeStubs: CrossEdgeStub[] = []

    const layerNodeIds = new Set<string>()

    // Copy layer nodes into new engine
    this.g.forEachNode((id, attrs) => {
      if (attrs.layerId === layerId) {
        layerNodeIds.add(id)
        engine.g.addNode(id, { ...attrs })
      }
    })

    // Copy lanes
    engine.lanes = [...this.lanes]

    // Process edges
    this.g.forEachEdge((edgeId, attrs, source, target) => {
      const sourceInLayer = layerNodeIds.has(source)
      const targetInLayer = layerNodeIds.has(target)

      if (sourceInLayer && targetInLayer) {
        // Internal edge — copy to new engine
        engine.g.addEdgeWithKey(edgeId, source, target, { ...attrs })
      } else if (sourceInLayer && !targetInLayer) {
        // Outgoing cross-layer edge
        const targetLayerId = this.g.getNodeAttribute(target, 'layerId')
        crossEdgeStubs.push({
          localNodeId: source,
          externalLayerId: targetLayerId,
          externalNodeId: target,
          direction: 'out',
          edgeData: attrs.data,
        })
      } else if (!sourceInLayer && targetInLayer) {
        // Incoming cross-layer edge
        const sourceLayerId = this.g.getNodeAttribute(source, 'layerId')
        crossEdgeStubs.push({
          localNodeId: target,
          externalLayerId: sourceLayerId,
          externalNodeId: source,
          direction: 'in',
          edgeData: attrs.data,
        })
      }
    })

    return { engine, crossEdgeStubs }
  }

  /**
   * Merge all nodes and internal edges from `source` engine into this graph.
   * All merged nodes receive `targetLayerId` as their layerId.
   */
  mergeLayer(source: RecipeGraphEngine, targetLayerId: string): void {
    source.g.forEachNode((id, attrs) => {
      this.g.addNode(id, { ...attrs, layerId: targetLayerId })
    })

    source.g.forEachEdge((edgeId, attrs, src, tgt) => {
      this.g.addEdgeWithKey(edgeId, src, tgt, { ...attrs })
    })
  }

  /**
   * Return all node IDs belonging to a given layer.
   */
  getLayerNodeIds(layerId: string): string[] {
    const ids: string[] = []
    this.g.forEachNode((id, attrs) => {
      if (attrs.layerId === layerId) ids.push(id)
    })
    return ids
  }

  // ─── Meta ───────────────────────────────────────────────────────

  get nodeCount(): number {
    return this.g.order
  }

  get edgeCount(): number {
    return this.g.size
  }

  get raw(): Graph<GraphNodeAttrs, GraphEdgeAttrs> {
    return this.g
  }
}

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * Evaluate a single where-condition against a field value.
 */
function matchesCondition(fieldValue: unknown, op: string, value?: unknown): boolean {
  switch (op) {
    case 'eq':
      return fieldValue === value
    case 'neq':
      return fieldValue !== value
    case 'gt':
      return typeof fieldValue === 'number' && typeof value === 'number' && fieldValue > value
    case 'lt':
      return typeof fieldValue === 'number' && typeof value === 'number' && fieldValue < value
    case 'gte':
      return typeof fieldValue === 'number' && typeof value === 'number' && fieldValue >= value
    case 'lte':
      return typeof fieldValue === 'number' && typeof value === 'number' && fieldValue <= value
    case 'in':
      return Array.isArray(value) && value.includes(fieldValue)
    case 'exists':
      return fieldValue !== undefined && fieldValue !== null
    default:
      return true
  }
}
