import type { RecipeGraphEngine } from './recipe-graph-engine'
import type { NodeTypeKey } from '@commons/types/recipe-graph'

/** Helper: get all node IDs from the engine */
function getAllNodeIds(engine: RecipeGraphEngine): string[] {
  const ids: string[] = []
  engine.forEachNode((id) => { ids.push(id) })
  return ids
}

// ── Query Types ─────────────────────────────────────────────────

export type GraphQueryType = 'find_path' | 'find_pattern' | 'find_nodes' | 'aggregate'

export interface NodeMatcher {
  type?: NodeTypeKey | NodeTypeKey[]
  layerId?: string
  where?: Record<string, MatchCondition>
  negate?: boolean
}

export interface MatchCondition {
  op: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'exists'
  value?: unknown
}

export interface GraphQuery {
  type: GraphQueryType
  // find_path
  from?: NodeMatcher
  to?: NodeMatcher
  through?: NodeMatcher
  notThrough?: NodeMatcher
  maxHops?: number
  // find_pattern
  pattern?: NodeMatcher[]
  // find_nodes
  where?: NodeMatcher
  // aggregate
  aggregate?: { field: string; op: 'sum' | 'max' | 'min' | 'avg' | 'count' }
  over?: 'nodes' | 'path'
}

export interface QueryResult {
  nodes: string[]
  paths?: string[][]
  value?: number
  matchCount: number
}

// ── Empty result constant ───────────────────────────────────────

const EMPTY_RESULT: QueryResult = { nodes: [], matchCount: 0 }

// ── Node Matching ───────────────────────────────────────────────

/**
 * Test whether a node in the graph matches the given NodeMatcher.
 * All conditions are AND-ed. If `negate` is true, the final result is inverted.
 */
export function matchesNode(
  engine: RecipeGraphEngine,
  nodeId: string,
  matcher: NodeMatcher,
): boolean {
  const node = engine.getNode(nodeId)
  if (!node) return false

  let result = true

  // Type match
  if (matcher.type !== undefined) {
    if (Array.isArray(matcher.type)) {
      if (!matcher.type.includes(node.type)) result = false
    } else {
      if (node.type !== matcher.type) result = false
    }
  }

  // Layer match
  if (result && matcher.layerId !== undefined) {
    if (node.lane !== matcher.layerId) result = false
  }

  // Field conditions
  if (result && matcher.where) {
    for (const [field, condition] of Object.entries(matcher.where)) {
      if (!evaluateCondition(node.data[field], condition)) {
        result = false
        break
      }
    }
  }

  return matcher.negate ? !result : result
}

function evaluateCondition(actual: unknown, condition: MatchCondition): boolean {
  const { op, value: expected } = condition

  switch (op) {
    case 'eq':
      return actual === expected
    case 'neq':
      return actual !== expected
    case 'gt':
      return typeof actual === 'number' && typeof expected === 'number' && actual > expected
    case 'lt':
      return typeof actual === 'number' && typeof expected === 'number' && actual < expected
    case 'gte':
      return typeof actual === 'number' && typeof expected === 'number' && actual >= expected
    case 'lte':
      return typeof actual === 'number' && typeof expected === 'number' && actual <= expected
    case 'in':
      return Array.isArray(expected) && expected.includes(actual)
    case 'exists':
      return actual !== undefined && actual !== null
    default:
      return false
  }
}

// ── Query Execution ─────────────────────────────────────────────

/**
 * Execute a graph query against the engine. Dispatches by query.type.
 * Never throws — returns an empty result for invalid/empty queries.
 */
export function executeQuery(
  engine: RecipeGraphEngine,
  query: GraphQuery,
): QueryResult {
  try {
    const allNodes = getAllNodeIds(engine)
    if (allNodes.length === 0) return { ...EMPTY_RESULT }

    switch (query.type) {
      case 'find_nodes':
        return executeFindNodes(engine, query, allNodes)
      case 'find_path':
        return executeFindPath(engine, query, allNodes)
      case 'find_pattern':
        return executeFindPattern(engine, query, allNodes)
      case 'aggregate':
        return executeAggregate(engine, query, allNodes)
      default:
        return { ...EMPTY_RESULT }
    }
  } catch {
    return { ...EMPTY_RESULT }
  }
}

// ── find_nodes ──────────────────────────────────────────────────

function executeFindNodes(
  engine: RecipeGraphEngine,
  query: GraphQuery,
  allNodes: string[],
): QueryResult {
  if (!query.where) return { ...EMPTY_RESULT }

  const matched = allNodes.filter((id) => matchesNode(engine, id, query.where!))
  return { nodes: matched, matchCount: matched.length }
}

// ── find_path ───────────────────────────────────────────────────

function executeFindPath(
  engine: RecipeGraphEngine,
  query: GraphQuery,
  allNodes: string[],
): QueryResult {
  if (!query.from || !query.to) return { ...EMPTY_RESULT }

  const fromIds = allNodes.filter((id) => matchesNode(engine, id, query.from!))
  const toIds = allNodes.filter((id) => matchesNode(engine, id, query.to!))

  if (fromIds.length === 0 || toIds.length === 0) return { ...EMPTY_RESULT }

  const allPaths: string[][] = []

  for (const fromId of fromIds) {
    for (const toId of toIds) {
      if (fromId === toId) continue
      const paths = engine.pathsBetween(fromId, toId, { maxHops: query.maxHops })
      allPaths.push(...paths)
    }
  }

  // Filter by through constraint
  let filtered = allPaths
  if (query.through) {
    filtered = filtered.filter((path) =>
      path.some((nodeId) => matchesNode(engine, nodeId, query.through!)),
    )
  }

  // Filter by notThrough constraint
  if (query.notThrough) {
    filtered = filtered.filter((path) =>
      !path.some((nodeId) => matchesNode(engine, nodeId, query.notThrough!)),
    )
  }

  if (filtered.length === 0) return { ...EMPTY_RESULT }

  const uniqueNodes = dedupe(filtered.flat())
  return {
    nodes: uniqueNodes,
    paths: filtered,
    matchCount: filtered.length,
  }
}

// ── find_pattern ────────────────────────────────────────────────

function executeFindPattern(
  engine: RecipeGraphEngine,
  query: GraphQuery,
  allNodes: string[],
): QueryResult {
  if (!query.pattern || query.pattern.length === 0) return { ...EMPTY_RESULT }

  const pattern = query.pattern
  const matchedSequences: string[][] = []

  // Find all nodes matching pattern[0], then DFS for successive pattern matchers
  const startNodes = allNodes.filter((id) => matchesNode(engine, id, pattern[0]))

  for (const startId of startNodes) {
    findPatternDFS(engine, pattern, 0, [startId], matchedSequences)
  }

  if (matchedSequences.length === 0) return { ...EMPTY_RESULT }

  const uniqueNodes = dedupe(matchedSequences.flat())
  return {
    nodes: uniqueNodes,
    paths: matchedSequences,
    matchCount: matchedSequences.length,
  }
}

/**
 * DFS walk following outgoing edges, matching successive pattern matchers.
 * `depth` is the index into pattern that has already been matched (the node
 * at sequence[depth] matched pattern[depth]). We look for successors matching
 * pattern[depth+1].
 */
function findPatternDFS(
  engine: RecipeGraphEngine,
  pattern: NodeMatcher[],
  depth: number,
  sequence: string[],
  results: string[][],
): void {
  // If we have matched all pattern elements, record the sequence
  if (depth === pattern.length - 1) {
    results.push([...sequence])
    return
  }

  const currentId = sequence[depth]
  const successors = engine.children(currentId)

  for (const nextId of successors) {
    // Avoid revisiting nodes already in the current sequence
    if (sequence.includes(nextId)) continue
    if (matchesNode(engine, nextId, pattern[depth + 1])) {
      sequence.push(nextId)
      findPatternDFS(engine, pattern, depth + 1, sequence, results)
      sequence.pop()
    }
  }
}

// ── aggregate ───────────────────────────────────────────────────

function executeAggregate(
  engine: RecipeGraphEngine,
  query: GraphQuery,
  allNodes: string[],
): QueryResult {
  if (!query.aggregate) return { ...EMPTY_RESULT }

  const { field, op } = query.aggregate
  let targetNodeIds: string[]

  if (query.over === 'path' && query.from && query.to) {
    // Aggregate along paths
    const pathResult = executeFindPath(engine, query, allNodes)
    targetNodeIds = pathResult.nodes
  } else {
    // Aggregate over matched nodes
    if (query.where) {
      targetNodeIds = allNodes.filter((id) => matchesNode(engine, id, query.where!))
    } else {
      targetNodeIds = allNodes
    }
  }

  if (targetNodeIds.length === 0) return { ...EMPTY_RESULT }

  // Extract numeric values
  const values: number[] = []
  for (const nodeId of targetNodeIds) {
    const node = engine.getNode(nodeId)
    if (!node) continue
    const raw = node.data[field]
    if (typeof raw === 'number' && !Number.isNaN(raw)) {
      values.push(raw)
    }
  }

  const computed = computeAggregate(values, op)
  return {
    nodes: targetNodeIds,
    value: computed,
    matchCount: targetNodeIds.length,
  }
}

function computeAggregate(
  values: number[],
  op: 'sum' | 'max' | 'min' | 'avg' | 'count',
): number {
  if (op === 'count') return values.length
  if (values.length === 0) return 0

  switch (op) {
    case 'sum':
      return values.reduce((a, b) => a + b, 0)
    case 'max':
      return Math.max(...values)
    case 'min':
      return Math.min(...values)
    case 'avg':
      return values.reduce((a, b) => a + b, 0) / values.length
    default:
      return 0
  }
}

// ── Utilities ───────────────────────────────────────────────────

function dedupe(ids: string[]): string[] {
  return [...new Set(ids)]
}
